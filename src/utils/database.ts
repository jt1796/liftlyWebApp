import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp, updateDoc, deleteDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { CustomExercise, Workout, Template, Script, UserProfile, Friendship, WorkoutYearDoc } from '../types';
import type { User } from 'firebase/auth';

const getCustomExercisesCollection = () => collection(db, 'customExercises');

export const getCustomExercises = async (
  userId: string
): Promise<CustomExercise[]> => {
  const docRef = doc(getCustomExercisesCollection(), userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().exercises;
  } else {
    return [];
  }
};

export const saveCustomExercises = async (
  userId: string,
  exercises: CustomExercise[]
) => {
  const docRef = doc(getCustomExercisesCollection(), userId);
  await setDoc(docRef, { exercises });
};

export const getWorkoutsForUser = async (userId: string): Promise<Workout[]> => {
  const q = query(
    collection(db, 'workoutYears'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);  // ~3-4 document reads (one per year)

  const workouts: Workout[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as WorkoutYearDoc;
    for (const [workoutId, workout] of Object.entries(data.workouts)) {
      workouts.push({
        ...workout,
        id: workoutId,
        date: (workout.date as unknown as Timestamp).toDate(),
      });
    }
  });

  workouts.sort((a, b) => b.date.getTime() - a.date.getTime());
  return workouts;
};

/**
 * Save a workout (create or update) in the year-bucketed collection.
 * Returns the workout ID.
 */
export const saveWorkout = async (
  userId: string,
  workout: Workout,
  existingId?: string
): Promise<string> => {
  const year = workout.date.getFullYear();
  const yearDocId = `${userId}_${year}`;
  const yearDocRef = doc(db, 'workoutYears', yearDocId);

  // Strip id from workout data — it's the map key, not a field
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...workoutData } = workout;

  if (existingId) {
    // Update existing workout
    // Check if the workout year changed (date was edited)
    const existingYear = await getWorkoutYear(userId, existingId);
    if (existingYear !== null && existingYear !== year) {
      // Year changed — delete from old year doc, create in new
      const oldYearDocRef = doc(db, 'workoutYears', `${userId}_${existingYear}`);
      await updateDoc(oldYearDocRef, {
        [`workouts.${existingId}`]: deleteField(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(yearDocRef, {
      userId,
      year,
      workouts: { [existingId]: workoutData },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return existingId;
  } else {
    // Create new workout
    const workoutId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await setDoc(yearDocRef, {
      userId,
      year,
      workouts: { [workoutId]: workoutData },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return workoutId;
  }
};

/**
 * Delete a workout from the year-bucketed collection.
 */
export const deleteWorkout = async (
  userId: string,
  workoutId: string,
  workoutDate: Date
): Promise<void> => {
  const year = workoutDate.getFullYear();
  const yearDocRef = doc(db, 'workoutYears', `${userId}_${year}`);

  await updateDoc(yearDocRef, {
    [`workouts.${workoutId}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Helper: find which year a workout belongs to by scanning cached year docs.
 * Returns null if not found.
 */
const getWorkoutYear = async (userId: string, workoutId: string): Promise<number | null> => {
  const q = query(
    collection(db, 'workoutYears'),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as WorkoutYearDoc;
    if (data.workouts[workoutId]) {
      return data.year;
    }
  }
  return null;
};

const getTemplatesCollection = () => collection(db, 'templates');

export const getTemplates = async (userId: string): Promise<Template[]> => {
  const docRef = doc(getTemplatesCollection(), userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().templates;
  } else {
    return [];
  }
};

export const saveTemplates = async (userId: string, templates: Template[]) => {
  const docRef = doc(getTemplatesCollection(), userId);
  await setDoc(docRef, { templates });
};

const getScriptsCollection = () => collection(db, 'scripts');

export const getScripts = async (userId: string): Promise<Script[]> => {
  const docRef = doc(getScriptsCollection(), userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().scripts;
  } else {
    return [];
  }
};

export const saveScripts = async (userId: string, scripts: Script[]) => {
  const docRef = doc(getScriptsCollection(), userId);
  await setDoc(docRef, { scripts });
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Deterministic, order-independent friendship doc ID */
const getFriendshipId = (uid1: string, uid2: string): string =>
  uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

// ─── User Profiles ──────────────────────────────────────────────────────────

/** Create or update the caller's profile doc (called after login) */
export const upsertUserProfile = async (user: User): Promise<void> => {
  const docRef = doc(db, 'userProfiles', user.uid);
  await setDoc(
    docRef,
    {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
    { merge: true }
  );
};

/** Look up any user's profile by UID (used when validating a friend code) */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, 'userProfiles', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
};

// ─── Friendships ─────────────────────────────────────────────────────────────

/** Fetch all friendships where the user is either requester or receiver */
export const getFriendships = async (uid: string): Promise<Friendship[]> => {
  const col = collection(db, 'friendships');
  const [snap1, snap2] = await Promise.all([
    getDocs(query(col, where('requesterId', '==', uid))),
    getDocs(query(col, where('receiverId', '==', uid))),
  ]);

  const seen = new Set<string>();
  const results: Friendship[] = [];

  for (const snap of [snap1, snap2]) {
    snap.forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      const data = d.data();
      results.push({
        id: d.id,
        requesterId: data.requesterId,
        receiverId: data.receiverId,
        status: data.status,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      });
    });
  }

  return results;
};

/** Send a friend request (currentUid → friendUid) */
export const sendFriendRequest = async (
  currentUid: string,
  friendUid: string
): Promise<void> => {
  const friendshipId = getFriendshipId(currentUid, friendUid);
  const docRef = doc(db, 'friendships', friendshipId);
  await setDoc(docRef, {
    requesterId: currentUid,
    receiverId: friendUid,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/** Accept a pending friend request (called by the receiver) */
export const acceptFriendRequest = async (
  currentUid: string,
  friendUid: string
): Promise<void> => {
  const friendshipId = getFriendshipId(currentUid, friendUid);
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
};

/** Remove or decline a friendship (works for either party) */
export const removeFriendship = async (
  currentUid: string,
  friendUid: string
): Promise<void> => {
  const friendshipId = getFriendshipId(currentUid, friendUid);
  await deleteDoc(doc(db, 'friendships', friendshipId));
};
