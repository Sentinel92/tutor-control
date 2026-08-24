import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

const CLIENT_STORAGE_UID_KEY = 'controlbot_device_client_uid';

export const getStableFallbackUid = (): string => {
  try {
    let localUid = localStorage.getItem(CLIENT_STORAGE_UID_KEY);
    if (!localUid) {
      localUid = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(CLIENT_STORAGE_UID_KEY, localUid);
    }
    return localUid;
  } catch {
    return 'user_default_guest';
  }
};

export const getClientUserId = async (): Promise<string> => {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  try {
    const user = await new Promise<User | null>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
      // Timeout in 1s if listener doesn't trigger immediately
      setTimeout(() => resolve(auth.currentUser), 1000);
    });

    if (user?.uid) return user.uid;

    // Attempt anonymous sign in, catching restricted operation gracefully
    try {
      const cred = await signInAnonymously(auth);
      if (cred?.user?.uid) return cred.user.uid;
    } catch (authErr: any) {
      // If anonymous auth is disabled in Google Cloud Console / Firebase, fall back to stable device UID
      if (authErr?.code !== 'auth/admin-restricted-operation') {
        console.warn('Anonymous auth notice:', authErr?.message || authErr);
      }
    }
  } catch (err) {
    // Fallback silently
  }

  return getStableFallbackUid();
};

export const initAnonymousAuth = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    try {
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }

      onAuthStateChanged(auth, async (user) => {
        if (user) {
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
          } catch (error: any) {
            // Suppress error banner when admin has not explicitly enabled anonymous provider in GCP
            resolve(null);
          }
        }
      });
    } catch {
      resolve(null);
    }
  });
};
