import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { Workout } from '../types';

export const calculateOneRepMax = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) {
    return 0;
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
      id: doc.id,
      ...data,
      date: (data.date as Timestamp).toDate(),
    } as Workout);
  });
  return workouts;
};
