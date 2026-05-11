import type { Workout, Script } from '../types';

export interface ScriptExecutionResult {
  workout: Workout;
  message?: string;
  logs?: string[];
  rawResult?: unknown;
}

export const executeScript = async (
  script: Script,
  history: Workout[]
): Promise<ScriptExecutionResult> => {
  // We'll use a Web Worker for sandboxing
  // Note: history will be cloned via structured clone when passed to worker
  const workerCode = `
    const logs = [];
    const capture = (type) => (...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return \`\${arg.message}\\n\${arg.stack}\`;
        }
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' ');
      logs.push(\`[\${timestamp}] [\${type.toUpperCase()}] \${message}\`);
    };

    console.log = capture('log');
    console.error = capture('error');
    console.warn = capture('warn');
    console.info = capture('info');
    console.debug = capture('debug');

    const validateWorkout = (w, context = 'Workout') => {
      if (!w || typeof w !== 'object') throw new Error(\`\${context} must be an object\`);
      
      const allowedWorkoutKeys = ['exercises', 'date', 'id'];
      Object.keys(w).forEach(key => {
        if (!allowedWorkoutKeys.includes(key)) {
          throw new Error(\`\${context} has unknown field: "\${key}"\`);
        }
      });

      if (!Array.isArray(w.exercises)) throw new Error(\`\${context} must have an "exercises" array\`);
      w.exercises.forEach((ex, i) => {
        const allowedExerciseKeys = ['name', 'sets', 'id'];
        Object.keys(ex).forEach(key => {
          if (!allowedExerciseKeys.includes(key)) {
            throw new Error(\`Exercise at index \${i} ("\${ex.name || 'unknown'}") has unknown field: "\${key}"\`);
          }
        });

        if (!ex.name || typeof ex.name !== 'string') throw new Error(\`Exercise at index \${i} must have a name string\`);
        if (!Array.isArray(ex.sets)) throw new Error(\`Exercise "\${ex.name}" (index \${i}) must have a "sets" array\`);
        ex.sets.forEach((set, si) => {
          const allowedSetKeys = ['weight', 'reps', 'id'];
          Object.keys(set).forEach(key => {
            if (!allowedSetKeys.includes(key)) {
              throw new Error(\`Set \${si} of exercise "\${ex.name}" has unknown field: "\${key}"\`);
            }
          });

          if (typeof set.weight !== 'number') throw new Error(\`Set \${si} of exercise "\${ex.name}" must have a numeric weight\`);
          if (typeof set.reps !== 'number') throw new Error(\`Set \${si} of exercise "\${ex.name}" must have numeric reps\`);
        });
      });
    };

    self.onmessage = async function(e) {
      const { code, history, lastExecutionMessage } = e.data;
      console.log('Script execution started');
      
      try {
        // Wrap code in a function to allow return
        const fn = new Function('history', 'lastExecutionMessage', code);
        
        let result = fn(history, lastExecutionMessage);
        
        // If the script returns a function, call it
        if (typeof result === 'function') {
          if (result.length !== 2) {
            throw new Error(\`The returned function must have exactly 2 arguments (history, lastExecutionMessage), but it has \${result.length}.\`);
          }
          console.log('Detected returned function, executing it...');
          const functionResult = result(history, lastExecutionMessage);
          if (functionResult === undefined) {
             throw new Error("The function returned by your script returned undefined.");
          }
          result = functionResult;
        }

        // Handle async results
        const resolvedResult = await Promise.resolve(result);
        const rawResult = resolvedResult;

        if (resolvedResult === undefined) {
          throw new Error("Script returned undefined. Ensure your script ends with a 'return' statement.");
        }

        if (resolvedResult === null) {
          throw new Error("Script returned null. A workout object is required.");
        }

        let finalWorkout;
        let finalMessage;

        // Handle various return formats
        if (typeof resolvedResult === 'object' && resolvedResult !== null) {
          const allowedRootKeys = ['workout', 'nextWorkout', 'message', 'lastExecutionMessage'];
          Object.keys(resolvedResult).forEach(key => {
            if (!allowedRootKeys.includes(key)) {
              throw new Error(\`Result object has unknown field: "\${key}"\`);
            }
          });

          const workoutCandidate = resolvedResult.workout || resolvedResult.nextWorkout;
          const messageCandidate = resolvedResult.message || resolvedResult.lastExecutionMessage;

          if (!workoutCandidate) {
            throw new Error("The script must return an object containing a 'nextWorkout' property.");
          }

          if (messageCandidate === undefined || messageCandidate === null) {
            throw new Error("The script must return an object containing a 'lastExecutionMessage' property to track progress.");
          }

          if (typeof messageCandidate !== 'string') {
            throw new Error("'lastExecutionMessage' must be a string.");
          }

          validateWorkout(workoutCandidate, resolvedResult.workout ? 'property "workout"' : 'property "nextWorkout"');

          finalWorkout = workoutCandidate;
          finalMessage = messageCandidate;
        } else {
          throw new Error("Script must return an object: { workout: Workout, message: string }.");
        }

        // Ensure date is a Date object
        finalWorkout.date = finalWorkout.date ? new Date(finalWorkout.date) : new Date();
        if (isNaN(finalWorkout.date.getTime())) {
          finalWorkout.date = new Date();
        }

        console.log('Script execution completed successfully');
        self.postMessage({ 
          success: true, 
          result: { 
            workout: finalWorkout, 
            message: finalMessage,
            logs,
            rawResult
          } 
        });
      } catch (error) {
        console.error('Script error:', error.message);
        self.postMessage({ success: false, error: error.message, logs });
      }
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  const worker = new Worker(URL.createObjectURL(blob));

  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        const error = new Error(e.data.error) as Error & { logs?: string[] };
        error.logs = e.data.logs;
        reject(error);
      }
      worker.terminate();
    };

    worker.onerror = (e) => {
      reject(new Error('Worker error: ' + e.message));
      worker.terminate();
    };

    worker.postMessage({
      code: script.code,
      history,
      lastExecutionMessage: script.lastExecutionMessage
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      worker.terminate();
      reject(new Error('Script timed out after 10 seconds'));
    }, 10000);
  });
};
