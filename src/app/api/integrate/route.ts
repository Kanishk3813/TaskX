import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../../utils/firebaseAdmin';

initFirebaseAdmin();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    let uid;
    if (state) {
      uid = state;
    } else {
      return NextResponse.json({ error: 'Missing user identification' }, { status: 400 });
    }

    // Set up OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrate`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const calendarsResponse = await calendar.calendarList.list();
    let calendarId;
    
    const existingCalendar = calendarsResponse.data.items?.find(
      cal => cal.summary === 'TaskX Events'
    );

    if (existingCalendar && existingCalendar.id) {
      calendarId = existingCalendar.id;
    } else {
      const calendarRes = await calendar.calendars.insert({
        requestBody: {
          summary: 'TaskX Events',
          timeZone: 'UTC'
        }
      });
      calendarId = calendarRes.data.id;
    }

    const db = getFirestore();
    await db.collection('users').doc(uid).set({
      googleTokens: tokens,
      googleCalendarId: calendarId
    }, { merge: true });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/?integration=success`
    );
  } catch (error) {
    console.error('Integration error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || ''}/?integration=error`
    );
  }
}