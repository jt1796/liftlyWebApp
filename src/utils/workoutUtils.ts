import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Workout } from '../types';

export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (reps <= 1) {
    return weight;
  }
  return Math.round(weight * (1 + reps / 30));
};

export const getWorkoutsForUser = async (userId: string): Promise<Workout[]> => {
  const workoutsCol = collection(db, 'workouts');
  const q = query(workoutsCol, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const workouts: Workout[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    workouts.push({
      ...data,
      id: doc.id,
      date: (data.date as Timestamp).toDate(),
    } as Workout);
  });
  return workouts;
};

export const getWorkoutById = async (id: string): Promise<Workout | null> => {
  const docRef = doc(db, 'workouts', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      date: (data.date as Timestamp).toDate(),
    } as Workout;
  } else {
    return null;
  }
};
