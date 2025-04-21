import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../../utils/firebaseAdmin';

// Initialize Firebase Admin
initFirebaseAdmin();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify Firebase ID token
    const decodedToken = await auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Get user's Google tokens from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    if (!userData?.googleTokens || !userData.googleCalendarId) {
      return res.status(400).json({ 
        error: 'Google Calendar not connected',
        needsIntegration: true
      });
    }
    
    // Set up OAuth2 client
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials(userData.googleTokens);
    
    // Check if tokens need refreshing
    if (userData.googleTokens.expiry_date && userData.googleTokens.expiry_date < Date.now()) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update tokens in Firestore
        await db.collection('users').doc(uid).update({
          'googleTokens': credentials
        });
        
        // Update the client with new tokens
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return res.status(401).json({ 
          error: 'Authentication expired',
          needsIntegration: true
        });
      }
    }
    
    // Get todo data from request
    const { todoId, text, deadline, calendarEventId } = req.body;
    
    if (!todoId || !text || !deadline) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Parse deadline string to Date object
    const deadlineDate = new Date(deadline);
    
    // Create end time (1 hour after deadline by default)
    const endTime = new Date(deadlineDate);
    endTime.setHours(endTime.getHours() + 1);
    
    // Create calendar service
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Create event object
    const event = {
      summary: text,
      description: `Task from TaskX (ID: ${todoId})`,
      start: {
        dateTime: deadlineDate.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
        ],
      },
    };
    
    let response;
    
    if (calendarEventId) {
      // Update existing event
      response = await calendar.events.update({
        calendarId: userData.googleCalendarId,
        eventId: calendarEventId,
        requestBody: event
      });
      
      return res.status(200).json({ 
        success: true,
        eventId: calendarEventId
      });
    } else {
      // Create new event
      response = await calendar.events.insert({
        calendarId: userData.googleCalendarId,
        requestBody: event
      });
      
      return res.status(200).json({ 
        success: true,
        eventId: response.data.id
      });
    }
  } catch (error) {
    console.error('Error syncing with Google Calendar:', error);
    
    // Send more detailed error for debugging
    return res.status(500).json({ 
      error: 'Failed to sync with Google Calendar',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}