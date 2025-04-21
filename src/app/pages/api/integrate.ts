import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI, 
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Exchange code for tokens
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);

    // Save tokens to Firestore
    const db = getFirestore();
    await setDoc(doc(db, 'users', user.uid), {
      googleTokens: tokens
    });

    // Create calendar service
    const calendar = google.calendar({ version: 'v3', auth: client });

    // Create a new calendar for the app
    const calendarRes = await calendar.calendars.insert({
      requestBody: {
        summary: 'TaskX Events',
        timeZone: 'UTC'
      }
    });

    // Save calendar ID
    await setDoc(doc(db, 'users', user.uid), {
      googleCalendarId: calendarRes.data.id
    });

    res.redirect('/?integration=success');
  } catch (error) {
    console.error('Integration error:', error);
    res.redirect('/?integration=error');
  }
}