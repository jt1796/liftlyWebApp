import type { Workout } from '../types';
import { calculateOneRepMax } from './workoutUtils';

export interface ExerciseDataPoint {
  date: Date;
  volume: number;
  estimatedOneRepMax: number;
}

export interface PR {
  exerciseName: string;
  date: Date;
  type: 'E1RM' | 'Max Weight';
  value: number;
  oldValue: number | null;
}

export const calculateAllPRs = (workouts: Workout[]): PR[] => {
  const sortedWorkouts = workouts
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const allPRs: PR[] = [];
  const exercisePRs = new Map<string, { max1RM: number; maxWeight: number }>();

  for (const workout of sortedWorkouts) {
    for (const exercise of workout.exercises) {
      const currentPRs = exercisePRs.get(exercise.name) || {
        max1RM: 0,
        maxWeight: 0,
      };

      let maxWeightInExercise = 0;
      let max1RMInExercise = 0;

      for (const set of exercise.sets) {
        if (set.weight > maxWeightInExercise) {
          maxWeightInExercise = set.weight;
        }
        const e1rm = calculateOneRepMax(set.weight, set.reps);
        if (e1rm > max1RMInExercise) {
          max1RMInExercise = e1rm;
        }
      }

      if (maxWeightInExercise > currentPRs.maxWeight) {
        allPRs.push({
          exerciseName: exercise.name,
          date: workout.date,
          type: 'Max Weight',
          value: maxWeightInExercise,
          oldValue: currentPRs.maxWeight === 0 ? null : currentPRs.maxWeight,
        });
        currentPRs.maxWeight = maxWeightInExercise;
      }

      if (max1RMInExercise > currentPRs.max1RM) {
        allPRs.push({
          exerciseName: exercise.name,
          date: workout.date,
          type: 'E1RM',
          value: max1RMInExercise,
          oldValue: currentPRs.max1RM === 0 ? null : currentPRs.max1RM,
        });
        currentPRs.max1RM = max1RMInExercise;
      }

      exercisePRs.set(exercise.name, currentPRs);
    }
  }

  return allPRs;
};


export interface LatestExercisePRs {
  e1rm?: {
    value: number;
    date: Date;
  };
  maxWeight?: {
    value: number;
    date: Date;
  };
}

export const getLatestExercisePRs = (
  workouts: Workout[],
  exerciseName: string
): LatestExercisePRs => {
  const allPRs = calculateAllPRs(workouts);

  const exercisePRs = allPRs.filter((pr) => pr.exerciseName === exerciseName);

  let latestE1RM: { value: number; date: Date } | undefined;
  let latestMaxWeight: { value: number; date: Date } | undefined;

  // Iterate in reverse to find the latest PRs efficiently
  for (let i = exercisePRs.length - 1; i >= 0; i--) {
    const pr = exercisePRs[i];
    if (pr.type === 'E1RM' && !latestE1RM) {
      latestE1RM = { value: pr.value, date: pr.date };
    }
    if (pr.type === 'Max Weight' && !latestMaxWeight) {
      latestMaxWeight = { value: pr.value, date: pr.date };
    }
    if (latestE1RM && latestMaxWeight) {
      break; // Found both latest PRs
    }
  }

  return {
    e1rm: latestE1RM,
    maxWeight: latestMaxWeight,
  };
};

export const calculateExerciseMetrics = (
  workouts: Workout[],
  exerciseName: string
): ExerciseDataPoint[] => {
  const data: ExerciseDataPoint[] = [];

  workouts.forEach((workout) => {
    const exercise = workout.exercises.find((e) => e.name === exerciseName);
    if (exercise) {
      let volume = 0;
      let maxWeightSet = { weight: 0, reps: 0 };

      exercise.sets.forEach((set) => {
        volume += set.weight * set.reps;
        if (set.weight > maxWeightSet.weight) {
          maxWeightSet = set;
        }
      });

      const estimatedOneRepMax = calculateOneRepMax(
        maxWeightSet.weight,
        maxWeightSet.reps
      );

      data.push({
        date: workout.date,
        volume,
        estimatedOneRepMax,
      });
    }
  });

  // Sort data by date
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
};
