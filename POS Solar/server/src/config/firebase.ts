import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

let app: App | null = null;
let firestore: Firestore | null = null;
let isFirebaseConnected = false;
let firebaseError: string | null = null;
let projectId = 'alp-solar-pos';

try {
  const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    const rawContent = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(rawContent);
    projectId = serviceAccount.project_id || 'alp-solar-pos';

    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId,
      });
    } else {
      app = getApps()[0];
    }

    firestore = getFirestore(app);
    firestore.settings({ ignoreUndefinedProperties: true });
    isFirebaseConnected = true;
    console.log(`[FIREBASE] Firebase Admin initialized for project: ${projectId}`);
  } else {
    console.warn(`[FIREBASE] serviceAccountKey.json not found at ${serviceAccountPath}`);
    firebaseError = 'serviceAccountKey.json not found';
  }
} catch (err: any) {
  console.error('[FIREBASE] Initialization error:', err?.message || err);
  firebaseError = err?.message || String(err);
  isFirebaseConnected = false;
}

/**
 * Health check test that verifies live communication with Firestore
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!firestore || !isFirebaseConnected) {
    return {
      success: false,
      message: firebaseError || 'Firebase is not initialized',
    };
  }

  try {
    // Write and read a lightweight system heartbeat
    const testDocRef = firestore.collection('_system_health').doc('connection_check');
    await testDocRef.set({
      last_connected_at: FieldValue.serverTimestamp(),
      system: 'Solar POS & ERP',
      project_id: projectId,
      status: 'ONLINE',
    }, { merge: true });

    const snap = await testDocRef.get();
    return {
      success: true,
      message: `Firebase Firestore successfully connected to project "${projectId}"!`,
      details: snap.data(),
    };
  } catch (err: any) {
    console.error('[FIREBASE] Firestore connection test failed:', err);
    return {
      success: false,
      message: `Firestore connection error: ${err?.message || err}`,
    };
  }
}

export { app, firestore, isFirebaseConnected, firebaseError, projectId, FieldValue };
