import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  projectId: appletConfig.projectId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId,
  appId: appletConfig.appId
};

const app = initializeApp(firebaseConfig);

// OPTIMIZED Firestore initialization with persistent multi-tab local cache.
// This acts as an automated query-caching connection pool on mobile and web clients, 
// protecting the Firestore backend from direct surges while keeping response times near-zero.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, appletConfig.firestoreDatabaseId);

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
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
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
