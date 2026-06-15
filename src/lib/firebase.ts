import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: 'confident-monument-s6tp2.firebaseapp.com', // Force default project domain as requested
  databaseURL: 'https://confident-monument-s6tp2-default-rtdb.firebaseio.com',
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
};

const app = initializeApp(firebaseConfig);

// OPTIMIZED Firestore initialization with persistent multi-tab local cache.
// This acts as an automated query-caching connection pool on mobile and web clients, 
// protecting the Firestore backend from direct surges while keeping response times near-zero.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, appletConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Persistent cache error during database initialization. Falling back to memory cache.", error);
  // Safely attempt to delete the corrupted Firestore database if possible to let client clean up
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const dbPrefix = `firestore/[DEFAULT]/${appletConfig.projectId}/${appletConfig.firestoreDatabaseId}`;
      window.indexedDB.deleteDatabase(dbPrefix);
    }
  } catch (err) {
    console.error("Could not delete corrupted Firestore database:", err);
  }
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, appletConfig.firestoreDatabaseId);
}
export const db = dbInstance;

export const auth = getAuth(app);

// Use custom storage bucket as requested by the user
export const storage = getStorage(app, "gs://confident-monument-s6tp2.firebasestorage.app");

// Explicitly set persistence to local to prevent session loss on browser close
setPersistence(auth, browserLocalPersistence);

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// TEST CONNECTION (Removed to avoid false-positive offline messages when resolving rules prior to auth)

export const signIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider).catch(error => {
      console.error("Auth Log Details:", error.code, error.message);
      throw error;
    });
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      return;
    }
    if (error.code === 'auth/unauthorized-domain') {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth?unauthorized=true';
      }
      return;
    }
    console.error('Sign-in Error:', error);
  }
};

export const signOut = () => auth.signOut();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
