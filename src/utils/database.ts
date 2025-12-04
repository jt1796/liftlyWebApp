import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { CustomExercise, Workout } from '../types';

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

    workouts.sort((a, b) => b.date.getTime() - a.date.getTime());
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
