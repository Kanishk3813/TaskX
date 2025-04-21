import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../../utils/firebaseAdmin';

initFirebaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    const decodedToken = await auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    if (!userData?.googleTokens || !userData.googleCalendarId) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected',
        needsIntegration: true
      }, { status: 400 });
    }
    
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrate`
    );
    
    oauth2Client.setCredentials(userData.googleTokens);
    
    if (userData.googleTokens.expiry_date && userData.googleTokens.expiry_date < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        await db.collection('users').doc(uid).update({
          'googleTokens': credentials
        });

        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return NextResponse.json({ 
          error: 'Authentication expired',
          needsIntegration: true
        }, { status: 401 });
      }
    }
    
    const body = await request.json();
    const { todoId, text, deadline, calendarEventId } = body;
    
    if (!todoId || !text || !deadline) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const deadlineDate = new Date(deadline);
    
    const endTime = new Date(deadlineDate);
    endTime.setHours(endTime.getHours() + 1);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const event = {
      summary: text,
      description: `Task from TaskX (ID: ${todoId})`,
      start: {
        dateTime: deadlineDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, 
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
      visibility: 'public',
      transparency: 'opaque',
    };
    
    try {
      let response;
      
      if (calendarEventId) {
        response = await calendar.events.update({
          calendarId: userData.googleCalendarId,
          eventId: calendarEventId,
          requestBody: event
        });
        
        return NextResponse.json({ 
          success: true,
          eventId: calendarEventId
        });
      } else {
        response = await calendar.events.insert({
          calendarId: userData.googleCalendarId,
          requestBody: event
        });
        
        if (!response.data.id) {
          throw new Error('Failed to create event ID');
        }
        
        return NextResponse.json({ 
          success: true,
          eventId: response.data.id
        });
      }
    } catch (calendarError) {
      console.error('Calendar API error:', calendarError);
      return NextResponse.json({ 
        error: 'Calendar API error',
        message: calendarError instanceof Error ? calendarError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error syncing with Google Calendar:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}