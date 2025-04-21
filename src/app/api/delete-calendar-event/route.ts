import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { initFirebaseAdmin } from '../../../utils/firebaseAdmin';

initFirebaseAdmin();

export async function DELETE(request: NextRequest) {
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
    const { eventId } = body;
    
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    await calendar.events.delete({
      calendarId: userData.googleCalendarId,
      eventId: eventId
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete calendar event',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}