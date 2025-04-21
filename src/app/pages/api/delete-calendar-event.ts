import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../../utils/firebaseAdmin';

// Initialize Firebase Admin
initFirebaseAdmin();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;
  const uid = state as string; // We'll pass user ID in state parameter

  if (!code || !uid) {
    return res.status(400).json({ error: 'Missing code or user ID' });
  }

  try {
    // Set up OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Create calendar service
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create a new calendar for the app or use an existing one
    let calendarId;
    
    // First check if the user already has a TaskX calendar
    const calendarsResponse = await calendar.calendarList.list();
    const existingCalendar = calendarsResponse.data.items?.find(
      cal => cal.summary === 'TaskX Events'
    );

    if (existingCalendar && existingCalendar.id) {
      calendarId = existingCalendar.id;
    } else {
      // Create a new calendar
      const calendarRes = await calendar.calendars.insert({
        requestBody: {
          summary: 'TaskX Events',
          timeZone: 'UTC'
        }
      });
      calendarId = calendarRes.data.id;
    }

    // Save tokens and calendar ID to Firestore
    const db = getFirestore();
    await db.collection('users').doc(uid).set({
      googleTokens: tokens,
      googleCalendarId: calendarId
    }, { merge: true });

    // Redirect back to app
    res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || ''}/?integration=success`);
  } catch (error) {
    console.error('Integration error:', error);
    res.redirect(`${process.env.NEXT_PUBLIC_APP_URL || ''}/?integration=error`);
  }
}