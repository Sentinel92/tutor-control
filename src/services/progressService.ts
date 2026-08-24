import { db, getClientUserId } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserProgressData } from '../types/extra';

const STORAGE_LOCAL_KEY = 'controlbot_user_progress_cache';

const DEFAULT_PROGRESS: UserProgressData = {
  examDate: '',
  examTopic: 'Modelamiento y Análisis de Sistemas Dinámicos',
  completedTopicIds: [],
  solvedChallengeIds: [],
  notebookNotes: '',
  quizScore: { totalAnswered: 0, totalCorrect: 0 },
};

const getLocalCachedProgress = (): UserProgressData => {
  try {
    const cached = localStorage.getItem(STORAGE_LOCAL_KEY);
    if (cached) {
      return { ...DEFAULT_PROGRESS, ...JSON.parse(cached) };
    }
  } catch (e) {
    // Ignore cache parse error
  }
  return DEFAULT_PROGRESS;
};

const setLocalCachedProgress = (data: Partial<UserProgressData>) => {
  try {
    const current = getLocalCachedProgress();
    const merged = { ...current, ...data, lastUpdated: new Date().toISOString() };
    localStorage.setItem(STORAGE_LOCAL_KEY, JSON.stringify(merged));
  } catch (e) {
    // Ignore cache write error
  }
};

export const syncProgressToFirebase = async (data: Partial<UserProgressData>) => {
  // Always update local cache first
  setLocalCachedProgress(data);

  try {
    const uid = await getClientUserId();
    if (!uid) return;

    const userDocRef = doc(db, 'users', uid);
    await setDoc(
      userDocRef,
      {
        ...data,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Sync notice: using local cached storage until network reconnection');
  }
};

export const loadProgressFromFirebase = async (): Promise<UserProgressData> => {
  const localData = getLocalCachedProgress();
  try {
    const uid = await getClientUserId();
    if (!uid) return localData;

    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const remoteData = { ...DEFAULT_PROGRESS, ...(snap.data() as UserProgressData) };
      setLocalCachedProgress(remoteData);
      return remoteData;
    }
    return localData;
  } catch (error) {
    return localData;
  }
};

export const subscribeToUserProgress = (
  callback: (data: UserProgressData) => void
): (() => void) => {
  let unsubscribeSnapshot: (() => void) | null = null;

  // Immediately invoke with local cached data for instant UI
  callback(getLocalCachedProgress());

  getClientUserId().then((uid) => {
    if (!uid) return;
    try {
      const userDocRef = doc(db, 'users', uid);
      unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = { ...DEFAULT_PROGRESS, ...(docSnap.data() as UserProgressData) };
            setLocalCachedProgress(data);
            callback(data);
          }
        },
        (error) => {
          // Gracefully fallback to local storage
        }
      );
    } catch {
      // Gracefully fallback
    }
  });

  return () => {
    if (unsubscribeSnapshot) unsubscribeSnapshot();
  };
};
