const admin = require('firebase-admin');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * This function safely initializes Firebase only once
 */
function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Check if Firebase credentials are provided
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccountString) {
      console.warn('⚠️  Firebase credentials not found. Running in development mode.');
      console.warn('⚠️  Set FIREBASE_SERVICE_ACCOUNT in .env for production authentication.');
      return;
    }

    // Parse the service account JSON
    const serviceAccount = JSON.parse(serviceAccountString);
    
    // Validate that it has required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.warn('⚠️  Invalid Firebase service account format.');
      return;
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully!');
    console.log(`✅ Project ID: ${serviceAccount.project_id}`);
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('⚠️  Continuing in development mode without Firebase authentication.');
  }
}

/**
 * Check if Firebase is initialized and ready
 */
function isFirebaseReady() {
  return firebaseInitialized;
}

/**
 * Get Firebase Admin instance
 */
function getFirebaseAdmin() {
  if (!firebaseInitialized) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin;
}

module.exports = {
  initializeFirebase,
  isFirebaseReady,
  getFirebaseAdmin
};

