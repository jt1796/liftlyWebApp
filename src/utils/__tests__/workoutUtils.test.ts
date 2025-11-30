import { describe, it, expect } from 'vitest';
import { calculateOneRepMax, findSetToPR } from '../workoutUtils';

describe('workoutUtils', () => {
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
      expect(findSetToPR(0)).toEqual({ reps: 3, weight: 5 })
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
});