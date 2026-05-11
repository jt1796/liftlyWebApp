import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeScript } from '../scriptExecutor';
import type { Script, Workout } from '../../types';

// Mocking Web Worker and related APIs
class MockWorker {
  onmessage: (e: { data: unknown }) => void = () => {};
  onerror: (e: { message: string }) => void = () => {};
  terminate = vi.fn();

  private workerCode: string;

  constructor() {
    MockWorker.lastInstance = this;
    // The actual code is in the Blob.
    this.workerCode = MockWorker.currentBlobContent || '';
  }

  static lastInstance: MockWorker | null = null;
  static currentBlobContent: string = '';

  postMessage(data: unknown) {
    // Simulate the worker environment
    const self = {
      postMessage: (msg: unknown) => this.simulateMessage(msg),
      onmessage: null as ((e: { data: unknown }) => void) | null,
    };

    // Prepare the worker environment
    // The key is that workerCode REPLACES console.log with its own capture function.
    const runner = new Function('self', 'console', `
      ${this.workerCode}
    `);

    try {
      runner(self, console);
      // The worker sets self.onmessage
      if (self.onmessage) {
        self.onmessage({ data });
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.simulateError(e.message);
      } else {
        this.simulateError(String(e));
      }
    }
  }

  // Helper to simulate a message from the worker
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }

  // Helper to simulate an error from the worker
  simulateError(message: string) {
    if (this.onerror) {
      this.onerror({ message });
    }
  }
}

// Mock Blob and URL
class MockBlob {
  content: string[];
  options?: BlobPropertyBag;
  constructor(content: string[], options?: BlobPropertyBag) {
    this.content = content;
    this.options = options;
    MockWorker.currentBlobContent = content.join('');
  }
}

vi.stubGlobal('Blob', MockBlob);
vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('mock-url') });
vi.stubGlobal('Worker', MockWorker);

describe('scriptExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockWorker.lastInstance = null;
    MockWorker.currentBlobContent = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockScript: Script = {
    id: '1',
    name: 'Test Script',
    code: 'return { nextWorkout: { exercises: [] }, lastExecutionMessage: "success" };',
    lastExecutionMessage: ''
  };

  const mockHistory: Workout[] = [];

  it('should resolve when worker returns success', async () => {
    const promise = executeScript(mockScript, mockHistory);

    // We don't need to manually simulate message anymore if postMessage runs the logic
    const result = await promise;
    expect(result.message).toBe('success');
    expect(result.workout.exercises).toEqual([]);
  });

  it('should reject when worker returns failure (invalid script)', async () => {
    const invalidScript = { ...mockScript, code: 'throw new Error("Custom Error");' };
    const promise = executeScript(invalidScript, mockHistory);

    await expect(promise).rejects.toThrow('Custom Error');
  });

  it('should reject on timeout', async () => {
    // To test timeout, we need a script that doesn't call postMessage.
    // Our MockWorker calls it synchronously, so we'd need to mock it differently
    // to test the timeout logic in executeScript.

    // Let's use a non-executing MockWorker for this test.
    const originalPostMessage = MockWorker.prototype.postMessage;
    MockWorker.prototype.postMessage = vi.fn();

    const promise = executeScript(mockScript, mockHistory);
    vi.advanceTimersByTime(10001);
    await expect(promise).rejects.toThrow('Script timed out after 10 seconds');

    MockWorker.prototype.postMessage = originalPostMessage;
  });
});

describe('scriptExecutor worker logic details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWorker.lastInstance = null;
  });

  const mockHistory: Workout[] = [];

  it('should handle scripts returning a function', async () => {
    const script = {
      id: '1',
      name: 'Fn Script',
      code: 'return (history) => ({ nextWorkout: { exercises: [] }, lastExecutionMessage: "fn success" });',
      lastExecutionMessage: ''
    };
    const result = await executeScript(script, mockHistory);
    expect(result.message).toBe('fn success');
  });

  it('should handle async scripts', async () => {
    const script = {
      id: '1',
      name: 'Async Script',
      code: 'return Promise.resolve({ nextWorkout: { exercises: [] }, lastExecutionMessage: "async success" });',
      lastExecutionMessage: ''
    };
    const result = await executeScript(script, mockHistory);
    expect(result.message).toBe('async success');
  });

  it('should support both workout and nextWorkout properties', async () => {
    const script1 = {
      id: '1',
      name: 'Workout Script',
      code: 'return { workout: { exercises: [] }, message: "success 1" };',
      lastExecutionMessage: ''
    };
    const result1 = await executeScript(script1, mockHistory);
    expect(result1.message).toBe('success 1');

    const script2 = {
      id: '2',
      name: 'NextWorkout Script',
      code: 'return { nextWorkout: { exercises: [] }, lastExecutionMessage: "success 2" };',
      lastExecutionMessage: ''
    };
    const result2 = await executeScript(script2, mockHistory);
    expect(result2.message).toBe('success 2');
  });

  it('should validate the workout structure', async () => {
    const script = {
      id: '1',
      name: 'Invalid Workout',
      code: 'return { nextWorkout: { exercises: [{ name: "Ex", sets: [{ weight: "100", reps: 5 }] }] }, lastExecutionMessage: "bad" };',
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow('Set 0 of exercise "Ex" must have a numeric weight');
  });

  it('should capture logs', async () => {
    const script = {
      id: '1',
      name: 'Log Script',
      code: 'console.log("Hello Log"); return { nextWorkout: { exercises: [] }, lastExecutionMessage: "logged" };',
      lastExecutionMessage: ''
    };
    const result = await executeScript(script, mockHistory);
    expect(result.logs?.some(l => l.includes('Hello Log'))).toBe(true);
  });

  it('should throw if return value is undefined', async () => {
    const script = {
      id: '1',
      name: 'Undefined Script',
      code: 'const a = 1;',
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow('Script returned undefined');
  });

  it('should throw if return value is null', async () => {
    const script = {
      id: '1',
      name: 'Null Script',
      code: 'return null;',
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow('Script returned null');
  });

  it('should throw if nextWorkout property is missing', async () => {
    const script = {
      id: '1',
      name: 'Missing Workout',
      code: 'return { message: "no workout" };',
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow("The script must return an object containing a 'nextWorkout' property.");
  });

  it('should throw if lastExecutionMessage property is missing', async () => {
    const script = {
      id: '1',
      name: 'Missing Message',
      code: 'return { nextWorkout: { exercises: [] } };',
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow("The script must return an object containing a 'lastExecutionMessage' property");
  });

  it('should handle invalid syntax in scripts', async () => {
    const script = {
      id: '1',
      name: 'Syntax Error Script',
      code: 'const a = ;', // Invalid syntax
      lastExecutionMessage: ''
    };
    await expect(executeScript(script, mockHistory)).rejects.toThrow();
  });

  it('should correctly execute a Starting Strength (Phase 1) progression over 6 workouts', async () => {
    const ssScriptCode = `
      const historyArg = arguments[0];
      const lastMessage = arguments[1];

      const getLatestWeight = (exerciseName, defaultWeight) => {
        for (let i = historyArg.length - 1; i >= 0; i--) {
          const workout = historyArg[i];
          const exercise = workout.exercises.find(e => e.name === exerciseName);
          if (exercise && exercise.sets.length > 0) {
            return exercise.sets[0].weight;
          }
        }
        return defaultWeight;
      };

      const lastWorkoutType = lastMessage || 'B';
      const nextType = lastWorkoutType === 'A' ? 'B' : 'A';

      const squatWeight = getLatestWeight('Squat', 40) + 5;
      const deadliftWeight = getLatestWeight('Deadlift', 125) + 10;

      const exercises = [];
      exercises.push({ name: 'Squat', sets: Array(3).fill({ weight: squatWeight, reps: 5 }) });

      if (nextType === 'A') {
        const pressWeight = getLatestWeight('Press', 60) + 5;
        exercises.push({ name: 'Press', sets: Array(3).fill({ weight: pressWeight, reps: 5 }) });
      } else {
        const benchWeight = getLatestWeight('Bench Press', 95) + 5;
        exercises.push({ name: 'Bench Press', sets: Array(3).fill({ weight: benchWeight, reps: 5 }) });
      }

      exercises.push({ name: 'Deadlift', sets: [{ weight: deadliftWeight, reps: 5 }] });

      return {
        nextWorkout: { exercises },
        lastExecutionMessage: nextType
      };
    `;

    let history: Workout[] = [];
    let lastMessage = '';
    const scriptId = 'ss-script';

    const expectedWorkouts = [
      { type: 'A', squat: 45, press: 65, dl: 135 },
      { type: 'B', squat: 50, bench: 100, dl: 145 },
      { type: 'A', squat: 55, press: 70, dl: 155 },
      { type: 'B', squat: 60, bench: 105, dl: 165 },
      { type: 'A', squat: 65, press: 75, dl: 175 },
      { type: 'B', squat: 70, bench: 110, dl: 185 },
    ];

    for (let i = 0; i < 6; i++) {
      const script: Script = {
        id: scriptId,
        name: 'Starting Strength',
        code: ssScriptCode,
        lastExecutionMessage: lastMessage
      };

      const result = await executeScript(script, history);
      const expected = expectedWorkouts[i];

      expect(result.message).toBe(expected.type);
      const exercises = result.workout.exercises;
      expect(exercises[0].name).toBe('Squat');
      expect(exercises[0].sets[0].weight).toBe(expected.squat);

      if (expected.type === 'A') {
        expect(exercises[1].name).toBe('Press');
        expect(exercises[1].sets[0].weight).toBe(expected.press);
      } else {
        expect(exercises[1].name).toBe('Bench Press');
        expect(exercises[1].sets[0].weight).toBe(expected.bench);
      }

      expect(exercises[2].name).toBe('Deadlift');
      expect(exercises[2].sets[0].weight).toBe(expected.dl);

      history = [...history, result.workout];
      lastMessage = result.message ?? '';
    }
  });
});
