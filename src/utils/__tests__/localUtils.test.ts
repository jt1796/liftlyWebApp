import { describe, it, expect } from 'vitest';
import {
  calculateAllPRs,
  getLatestExercisePRs,
  calculateExerciseMetrics,
  calculateOneRepMax,
  findSetToPR,
  createFilterOptions,
  workoutToText,
} from '../localUtils';
import type { Workout } from '../../types';

describe('localUtils', () => {
  const mockWorkouts: Workout[] = [
    {
      id: '1',
      date: new Date('2023-01-01'),
      exercises: [
        {
          name: 'Bench Press',
          sets: [
            { weight: 100, reps: 5 },
            { weight: 105, reps: 3 },
          ],
        },
        {
          name: 'Squat',
          sets: [{ weight: 120, reps: 5 }],
        },
      ],
    },
    {
      id: '2',
      date: new Date('2023-01-05'),
      exercises: [
        {
          name: 'Bench Press',
          sets: [
            { weight: 100, reps: 5 },
            { weight: 110, reps: 3 },
          ],
        },
        {
          name: 'Deadlift',
          sets: [{ weight: 150, reps: 5 }],
        },
      ],
    },
    {
      id: '3',
      date: new Date('2023-01-10'),
      exercises: [
        {
          name: 'Bench Press',
          sets: [
            { weight: 100, reps: 5 },
            { weight: 115, reps: 2 },
          ],
        },
      ],
    },
  ];

  describe('createFilterOptions', () => {
    const allExercises = [
      'Bench Press',
      'Squat',
      'Deadlift',
      'Overhead Press',
      'Barbell Row',
      'Dumbbell Curl',
      'Triceps Extension',
      'Leg Press',
      'Generic row machine',
    ];

    const filterOptions = createFilterOptions(allExercises);

    it('should filter options case-insensitively and with partial matches', () => {
      expect(filterOptions(allExercises, { inputValue: 'bench' })).toEqual(['Bench Press', 'Generic row machine']);
      expect(filterOptions(allExercises, { inputValue: 'row' })).toEqual(['Barbell Row', 'Generic row machine']);
      expect(filterOptions(allExercises, { inputValue: 'generic row' })).toEqual(['Generic row machine', 'Barbell Row']);
    });

    it('should handle fuzzy matches/typos', () => {
      expect(filterOptions(allExercises, { inputValue: 'squattt' })).toEqual(['Squat']);
      expect(filterOptions(allExercises, { inputValue: 'dedlift' })).toEqual(['Deadlift']);
    });

    it('should return all options (sliced to 200) if inputValue is empty', () => {
      expect(filterOptions(allExercises, { inputValue: '' })).toEqual(allExercises);
    });

    it('should return an empty array if no matches are found', () => {
      expect(filterOptions(allExercises, { inputValue: 'blahblahblah' })).toEqual([]);
    });

    it('should return options that exactly match', () => {
      expect(filterOptions(allExercises, { inputValue: 'Squat' })).toEqual(['Squat']);
    });

    it('should return options in a sorted manner', () => {
      const result = filterOptions(allExercises, { inputValue: 'machine' });
      expect(result).toEqual(['Generic row machine']);
    });

    it('should handle multi-word queries where order does not matter', () => {
      const result = filterOptions(allExercises, { inputValue: 'machine row' });
      expect(result).toEqual(['Barbell Row', 'Generic row machine']);

      const result2 = filterOptions(allExercises, {
        inputValue: 'row machine',
      });
      expect(result2).toEqual(['Generic row machine']);
    });
  });

  describe('calculateAllPRs', () => {
    it('should calculate all PRs correctly', () => {
      const prs = calculateAllPRs(mockWorkouts);

      expect(prs).toHaveLength(10);

      expect(prs).toMatchInlineSnapshot(`
        [
          {
            "date": 2023-01-01T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": null,
            "type": "Max Weight",
            "value": 105,
          },
          {
            "date": 2023-01-01T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": null,
            "type": "E1RM",
            "value": 117,
          },
          {
            "date": 2023-01-01T00:00:00.000Z,
            "exerciseName": "Squat",
            "oldValue": null,
            "type": "Max Weight",
            "value": 120,
          },
          {
            "date": 2023-01-01T00:00:00.000Z,
            "exerciseName": "Squat",
            "oldValue": null,
            "type": "E1RM",
            "value": 140,
          },
          {
            "date": 2023-01-05T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": 105,
            "type": "Max Weight",
            "value": 110,
          },
          {
            "date": 2023-01-05T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": 117,
            "type": "E1RM",
            "value": 121,
          },
          {
            "date": 2023-01-05T00:00:00.000Z,
            "exerciseName": "Deadlift",
            "oldValue": null,
            "type": "Max Weight",
            "value": 150,
          },
          {
            "date": 2023-01-05T00:00:00.000Z,
            "exerciseName": "Deadlift",
            "oldValue": null,
            "type": "E1RM",
            "value": 175,
          },
          {
            "date": 2023-01-10T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": 110,
            "type": "Max Weight",
            "value": 115,
          },
          {
            "date": 2023-01-10T00:00:00.000Z,
            "exerciseName": "Bench Press",
            "oldValue": 121,
            "type": "E1RM",
            "value": 123,
          },
        ]
      `);
    });

    it('should return an empty array if no workouts are provided', () => {
      const prs = calculateAllPRs([]);
      expect(prs).toHaveLength(0);
    });

    it('should handle workouts with no exercises', () => {
      const workoutsWithNoExercises: Workout[] = [
        { id: '1', date: new Date('2023-01-01'), exercises: [] },
      ];
      const prs = calculateAllPRs(workoutsWithNoExercises);
      expect(prs).toHaveLength(0);
    });

    it('should handle exercises with no sets', () => {
      const workoutsWithNoSets: Workout[] = [
        {
          id: '1',
          date: new Date('2023-01-01'),
          exercises: [{ name: 'Bench Press', sets: [] }],
        },
      ];
      const prs = calculateAllPRs(workoutsWithNoSets);
      expect(prs).toHaveLength(0);
    });
  });

  describe('getLatestExercisePRs', () => {
    it('should return the latest E1RM and Max Weight PRs for a given exercise', () => {
      const latestPRs = getLatestExercisePRs(mockWorkouts, 'Bench Press');

      expect(latestPRs).toMatchInlineSnapshot(`
        {
          "e1rm": {
            "date": 2023-01-10T00:00:00.000Z,
            "value": 123,
          },
          "maxWeight": {
            "date": 2023-01-10T00:00:00.000Z,
            "value": 115,
          },
        }
      `);
    });

    it('should return undefined for PRs that do not exist for the exercise', () => {
      const latestPRs = getLatestExercisePRs(mockWorkouts, 'Pull Up');
      expect(latestPRs.e1rm).toBeUndefined();
      expect(latestPRs.maxWeight).toBeUndefined();
    });
  });

  describe('calculateExerciseMetrics', () => {
    it('should calculate exercise metrics (volume, e1rm) correctly', () => {
      const metrics = calculateExerciseMetrics(mockWorkouts, 'Bench Press');

      expect(metrics).toHaveLength(3);

      expect(metrics).toMatchInlineSnapshot(`
        [
          {
            "date": 2023-01-01T00:00:00.000Z,
            "estimatedOneRepMax": 116,
            "volume": 815,
          },
          {
            "date": 2023-01-05T00:00:00.000Z,
            "estimatedOneRepMax": 121,
            "volume": 830,
          },
          {
            "date": 2023-01-10T00:00:00.000Z,
            "estimatedOneRepMax": 123,
            "volume": 730,
          },
        ]
      `);
    });

    it('should return an empty array if no workouts for the exercise are found', () => {
      const metrics = calculateExerciseMetrics(mockWorkouts, 'Pull Up');
      expect(metrics).toHaveLength(0);
    });

    it('should handle workouts where the exercise has no sets', () => {
      const workoutsWithNoSets: Workout[] = [
        {
          id: '1',
          date: new Date('2023-01-01'),
          exercises: [{ name: 'Bench Press', sets: [] }],
        },
      ];
      const metrics = calculateExerciseMetrics(workoutsWithNoSets, 'Bench Press');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].volume).toBe(0);
      expect(metrics[0].estimatedOneRepMax).toBe(0);
    });
  });

  describe('calculateOneRepMax', () => {
    it('should return 0 if reps are 0', () => {
      expect(calculateOneRepMax(100, 0)).toBe(0);
    });

    it('should return weight if reps are 1', () => {
      expect(calculateOneRepMax(100, 1)).toBe(100);
    });

    it('should calculate 1RM correctly for typical reps (Brzycki formula approximation)', () => {
      expect(calculateOneRepMax(100, 5)).toBe(117);
      expect(calculateOneRepMax(80, 10)).toBe(107);
    });

    it('should handle decimal weights correctly', () => {
      expect(calculateOneRepMax(77.5, 5)).toBe(90);
    });
  });


  describe('findSetToPR', () => {
    it('should return if targetE1RM is 0', () => {
      expect(findSetToPR(0)).toEqual({ reps: 3, weight: 5 });
    });

    it.each([
      [100, 8, 80],
      [117, 17, 75],
    ])('should find a set that gets closest to the target E1RM', (targetE1RM, reps, weight) => {
      const result = findSetToPR(targetE1RM);
      expect(result).toBeDefined();
      expect(result!.reps).toEqual(reps);
      expect(result!.weight).toEqual(weight);
    });
  });

  describe('workoutToText', () => {
    const mockWorkout = {
      id: '4',
      date: new Date('2023-03-15T10:00:00.000Z'),
      exercises: [
        {
          name: 'Overhead Press',
          sets: [
            { weight: 50, reps: 5 },
            { weight: 55, reps: 3 },
          ],
        },
        {
          name: 'Deadlift',
          sets: [
            { weight: 130, reps: 5 },
            { weight: 140, reps: 3 },
            { weight: 150, reps: 1 },
          ],
        },
      ],
    };

    it('should convert workout to plain text format', () => {
      const result = workoutToText(mockWorkout, 'txt');
      expect(result).toMatchInlineSnapshot(`
        "Workout on March 15, 2023

        Overhead Press
          - 50 x 5
          - 55 x 3

        Deadlift
          - 130 x 5
          - 140 x 3
          - 150 x 1"
      `);
    });

    it('should convert workout to phpBB format', () => {
      const result = workoutToText(mockWorkout, 'phpbb');
      expect(result).toMatchInlineSnapshot(`
        "[u][size=200]Workout on March 15, 2023[/size][/u]

        [b][size=125]Overhead Press[/size][/b]
          - 50 x 5
          - 55 x 3

        [b][size=125]Deadlift[/size][/b]
          - 130 x 5
          - 140 x 3
          - 150 x 1"
      `);
    });
  });
});
