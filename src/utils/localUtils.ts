import Fuse from 'fuse.js';
import type { Workout } from '../types';
import dayjs from 'dayjs';

export const createFilterOptions = (allExercises: string[]) => {
  const fuseOptions = {
    shouldSort: true,
  };
  const fuse = new Fuse(allExercises, fuseOptions);

  return (options: string[], { inputValue }: { inputValue: string }) => {
    if (!inputValue) {
      return options;
    }

    return fuse.search(inputValue).map((res) => res.item);
  };
};

export interface ExerciseDataPoint {
  date: Date;
  volume: number;
  estimatedOneRepMax: number;
  maxWeight: number;
}

export interface PR {
  exerciseName: string;
  date: Date;
  type: 'E1RM' | 'Max Weight';
  value: number;
  oldValue: number | null;
}

export const calculateOneRepMax = (weight: number, reps: number) => {
  if (reps === 0) {
    return 0;
  }
  if (reps === 1) {
    return weight;
  }

  return Math.round(weight * (1 + reps / 30));
};

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
        maxWeight: maxWeightSet.weight,
      });
    }
  });

  // Sort data by date
  return data.sort((a, b) => a.date.getTime() - b.date.getTime());
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

export const getE1RmSuggestions = (allWorkouts: Workout[], currentWorkout: Workout): Record<string, number> => {

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

    for (const set of exercise.sets) {
      const e1rm = calculateOneRepMax(set.weight, set.reps);
      if (e1rm > maxE1RMForExercise) {
        maxE1RMForExercise = e1rm;
      }
    }

    if (maxE1RMForExercise > 0) {
      newE1RMSuggestions[exercise.name] = maxE1RMForExercise;
    }
  }
  return newE1RMSuggestions;
};


export const getExerciseHistory = (
  workouts: Workout[],
  exerciseName: string,
  limit = 10
) => {
  const history = workouts
    .filter((workout) =>
      workout.exercises.some((e) => e.name === exerciseName)
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit)
    .map((workout) => {
      const exercise = workout.exercises.find((e) => e.name === exerciseName)!;
      return {
        ...workout,
        exercise,
      };
    });

  return history;
};

export const workoutToText = (workout: Workout, format: 'txt' | 'phpbb', allWorkouts?: Workout[]) => {
  const workoutsList = allWorkouts ? [...allWorkouts] : [];
  if (allWorkouts) {
    const index = workoutsList.findIndex((w) => w.id && workout.id && w.id === workout.id);
    if (index !== -1) {
      workoutsList[index] = workout;
    } else {
      workoutsList.push(workout);
    }
  }
  const workoutDate = new Date(workout.date);
  const workoutDateTime = isNaN(workoutDate.getTime()) ? new Date().getTime() : workoutDate.getTime();
  const prs = allWorkouts ? calculateAllPRs(workoutsList).filter(pr => new Date(pr.date).getTime() === workoutDateTime) : [];

  const workoutText = workout.exercises
    .map((exercise) => {
      const exerciseName =
        format === 'phpbb'
          ? `[b][size=125]${exercise.name}[/size][/b]`
          : exercise.name;
      const sets = exercise.sets
        .map((set) => `  - ${set.weight} x ${set.reps}`)
        .join('\n');

      const exercisePRs = prs.filter(pr => pr.exerciseName === exercise.name);
      let prText = '';
      if (exercisePRs.length > 0) {
        const prStrings = exercisePRs.map(pr => {
          const prefix = format === 'phpbb' ? '[b]PR![/b]' : 'PR!';
          const detail = pr.oldValue ? ` (was ${pr.oldValue})` : '';
          return `  ${prefix} New ${pr.type}: ${pr.value}${detail}`;
        });
        prText = '\n' + prStrings.join('\n');
      }

      return `${exerciseName}\n${sets}${prText}`;
    })
    .join('\n\n');

  const title = `Workout on ${dayjs(workout.date).format(
    'MMMM D, YYYY'
  )}`;
  const dateSegment = format === 'txt' ? title : `[u][size=200]${title}[/size][/u]`;

  return dateSegment + '\n\n' + workoutText;
};

export const getWorkoutsInDateRange = (workouts: Workout[], days: number) => {
  const dateToCompare = dayjs().subtract(days, 'day').toDate();
  return workouts.filter((workout) => workout.date > dateToCompare);
};

export const countExerciseFrequency = (workouts: Workout[], exerciseName: string) => {
  return workouts.reduce((count, workout) => {
    const exercise = workout.exercises.find((e) => e.name === exerciseName);
    return exercise ? count + 1 : count;
  }, 0);
};

export const getPRsInDateRange = (workouts: Workout[], days: number) => {
  const allPRs = calculateAllPRs(workouts);
  const dateToCompare = dayjs().subtract(days, 'day').toDate();
  return allPRs.filter((pr) => pr.date > dateToCompare);
}

export const generateFacts = (workouts: Workout[]): string[] => {
  const facts: string[] = [];
  const recentWorkouts = getWorkoutsInDateRange(workouts, 30);

  if (recentWorkouts.length > 0) {
    facts.push(`You worked out ${recentWorkouts.length} times in the last 30 days`);

    const exerciseFrequency = new Map<string, number>();
    for (const workout of recentWorkouts) {
      for (const exercise of workout.exercises) {
        const frequency = exerciseFrequency.get(exercise.name) || 0;
        exerciseFrequency.set(exercise.name, frequency + 1);
      }
    }

    for (const [exerciseName, frequency] of exerciseFrequency.entries()) {
      if (frequency > 1) {
        facts.push(`You've trained ${exerciseName} ${frequency} times in the last 30 days`);
      }
    }

    const recentPRs = getPRsInDateRange(workouts, 30);
    for (const pr of recentPRs) {
      facts.push(`You set a new PR on ${pr.exerciseName} of ${pr.value} lbs for ${pr.type} on ${dayjs(pr.date).format('MMMM D')}`);
    }
  } else {
    facts.push('You have no recent workouts. Time to hit the gym!');
  }

  facts.sort(() => Math.random() - 0.5);

  return facts;
};

export interface SetPRDetails {
  isPR: boolean;
  isMaxWeightPR: boolean;
  isE1RMPR: boolean;
  prevMaxWeight: number | null;
  prevMax1RM: number | null;
}

export const getPRDetailsForWorkout = (
  currentWorkout: Workout,
  allWorkouts: Workout[]
) => {
  const currentWorkoutDate = currentWorkout.date ? new Date(currentWorkout.date) : new Date();
  const currentWorkoutDateTime = isNaN(currentWorkoutDate.getTime()) ? new Date().getTime() : currentWorkoutDate.getTime();

  const history = allWorkouts.filter(
    (w) =>
      w.id !== currentWorkout.id &&
      w.date &&
      new Date(w.date).getTime() < currentWorkoutDateTime
  );

  const pastMaxes: Record<string, { maxWeight: number; max1RM: number }> = {};
  for (const pw of history) {
    for (const ex of pw.exercises) {
      if (!pastMaxes[ex.name]) {
        pastMaxes[ex.name] = { maxWeight: 0, max1RM: 0 };
      }
      const m = pastMaxes[ex.name];
      for (const set of ex.sets) {
        if (set.weight > m.maxWeight) {
          m.maxWeight = set.weight;
        }
        const e1rm = calculateOneRepMax(set.weight, set.reps);
        if (e1rm > m.max1RM) {
          m.max1RM = e1rm;
        }
      }
    }
  }

  const setPRDetails: Record<string, SetPRDetails> = {};
  const exerciseBests: Record<string, { maxWeight: number; max1RM: number }> = {};

  for (const ex of currentWorkout.exercises) {
    for (const set of ex.sets) {
      const weight = isNaN(set.weight) ? 0 : set.weight;
      const reps = isNaN(set.reps) ? 0 : set.reps;
      const e1rm = calculateOneRepMax(weight, reps);
      const m = pastMaxes[ex.name] || { maxWeight: 0, max1RM: 0 };

      const isMaxWeightPR = m.maxWeight > 0 && weight > m.maxWeight;
      const isE1RMPR = m.max1RM > 0 && e1rm > m.max1RM;
      const isPR = isMaxWeightPR || isE1RMPR;

      if (set.id) {
        setPRDetails[set.id] = {
          isPR,
          isMaxWeightPR,
          isE1RMPR,
          prevMaxWeight: m.maxWeight > 0 ? m.maxWeight : null,
          prevMax1RM: m.max1RM > 0 ? m.max1RM : null,
        };
      }
    }

    let currentBestWeight = 0;
    let currentBest1RM = 0;
    for (const set of ex.sets) {
      const weight = isNaN(set.weight) ? 0 : set.weight;
      const reps = isNaN(set.reps) ? 0 : set.reps;
      if (weight > currentBestWeight) {
        currentBestWeight = weight;
      }
      const e1rm = calculateOneRepMax(weight, reps);
      if (e1rm > currentBest1RM) {
        currentBest1RM = e1rm;
      }
    }
    exerciseBests[ex.name] = { maxWeight: currentBestWeight, max1RM: currentBest1RM };
  }

  const workoutPRList: { exerciseName: string; type: 'E1RM' | 'Max Weight'; value: number; oldValue: number | null }[] = [];
  for (const exName in exerciseBests) {
    const bests = exerciseBests[exName];
    const m = pastMaxes[exName] || { maxWeight: 0, max1RM: 0 };

    if (m.maxWeight > 0 && bests.maxWeight > m.maxWeight) {
      workoutPRList.push({
        exerciseName: exName,
        type: 'Max Weight',
        value: bests.maxWeight,
        oldValue: m.maxWeight,
      });
    }
    if (m.max1RM > 0 && bests.max1RM > m.max1RM) {
      workoutPRList.push({
        exerciseName: exName,
        type: 'E1RM',
        value: bests.max1RM,
        oldValue: m.max1RM,
      });
    }
  }

  return {
    setPRDetails,
    workoutPRList,
    workoutPRCount: workoutPRList.length,
  };
};
