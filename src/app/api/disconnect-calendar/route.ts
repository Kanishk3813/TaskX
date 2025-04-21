import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
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
    const userRef = db.collection('users').doc(uid);
    
    await userRef.update({
      googleTokens: null,
      googleCalendarId: null
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting from Google Calendar:', error);
    
    return NextResponse.json({ 
      error: 'Failed to disconnect from Google Calendar',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}