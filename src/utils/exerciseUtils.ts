import type { Workout } from '../types';
import { calculateOneRepMax } from './workoutUtils';

export interface ExerciseDataPoint {
  date: Date;
  volume: number;
  estimatedOneRepMax: number;
}

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
