import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Workout } from '../types';
import dayjs from 'dayjs';

export const calculateOneRepMax = (weight: number, reps: number) => {
  if (reps === 0) {
    return 0;
  }
  if (reps === 1) {
    return weight;
  }

  return Math.round(weight * (1 + reps / 30));
};

export const findSetToPR = (targetE1RM: number) => {
  let bestWeight = 0;
  let bestReps = 0;
  let smallestDifference = Infinity;

  for (let reps = 3; reps <= 20; reps++) {
    let requiredWeight = Math.ceil(targetE1RM / (1 + reps / 30));
    requiredWeight = Math.ceil(requiredWeight / 5) * 5;

    let currentE1RM = calculateOneRepMax(requiredWeight, reps);

    if (currentE1RM <= targetE1RM) {
      requiredWeight += 5;
      currentE1RM = calculateOneRepMax(requiredWeight, reps);
    }

    const difference = currentE1RM - targetE1RM;

    if (difference > 0 && difference < smallestDifference) {
      smallestDifference = difference;
      bestWeight = requiredWeight;
      bestReps = reps;
    }
  }

  if (bestReps === 0) {
    return null;
  }

  return { weight: bestWeight, reps: bestReps };
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

export const getE1RmSuggestions = async (userId: string, currentWorkout: Workout): Promise<Record<string, number>> => {
  const allWorkouts = await getWorkoutsForUser(userId);

  const threeMonthsAgo = dayjs().subtract(3, 'month');
  const recentWorkouts = allWorkouts.filter((w) => dayjs(w.date).isAfter(threeMonthsAgo));

  const newE1RMSuggestions: Record<string, number> = {};

  for (const exercise of currentWorkout.exercises) {
    let maxE1RMForExercise = 0;

    for (const pastWorkout of recentWorkouts) {
      const matchingPastExercise = pastWorkout.exercises.find(
        (e) => e.name === exercise.name
      );

      if (matchingPastExercise) {
        for (const set of matchingPastExercise.sets) {
          const e1rm = calculateOneRepMax(set.weight, set.reps);
          if (e1rm > maxE1RMForExercise) {
            maxE1RMForExercise = e1rm;
          }
        }
      }
    }
    if (maxE1RMForExercise > 0) {
      newE1RMSuggestions[exercise.name] = maxE1RMForExercise;
    }
  }
  return newE1RMSuggestions;
};
