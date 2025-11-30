import { describe, it, expect } from 'vitest';
import { calculateAllPRs, getLatestExercisePRs, calculateExerciseMetrics } from '../exerciseUtils';
import type { Workout } from '../../types';

describe('exerciseUtils', () => {
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

  describe('calculateAllPRs', () => {
    it('should calculate all PRs correctly', () => {
      const prs = calculateAllPRs(mockWorkouts);

      expect(prs).toHaveLength(4);

      expect(prs).toMatchInlineSnapshot(`
        [
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
});