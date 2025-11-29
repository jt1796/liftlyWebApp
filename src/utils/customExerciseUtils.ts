import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { CustomExercise } from '../types';

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
