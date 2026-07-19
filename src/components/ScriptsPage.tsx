import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, lazy, Suspense } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import { useApp } from '../contexts/app-context-utils';
import type { Script, Workout } from '../types';
import { exercises as builtInExercises } from '../data/exercises';
import {
  getScripts,
  saveScripts,
  getWorkoutsForUser,
  executeScript,
  getCustomExercises,
  type ScriptExecutionResult
} from '../utils';

const Editor = lazy(() => import('@monaco-editor/react'));

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const ensureIds = (scripts: Script[]): Script[] => {
  return scripts.map((script) => ({
    ...script,
    id: script.id || generateId(),
  }));
};

const emptyScript: Script = {
  lastExecutionMessage: '',
  name: '',
  code: `/** Try pasting this into gemini except for this line. Fill in <name of the workout program>
create javascript code that returns a function that generates the next <name of the workout program> workout based on:
- first parameter: the workout history of the user, and 
- second parameter: lastExecutionMessage, output from the last time this script was executed. Can be used to keep track of which day the program is on

workout type structure. don't add any extra fields:
{
  date: new Date(),
  exercises: [{
    name: "Bench Press",
    sets: [{ weight: 100, reps: 5 }]
  }],
}

lastExecutionMessage type structure:
"Week 1 Day 1"

The function must have this type and accept exactly these two parameters: (workoutHistory: workout[], lastExecutionMessage: string?) => { nextWorkout: workout, lastExecutionMessage: string }

Example script based on the Starting Strength program:

const INITIAL_WEIGHTS = {
  "Squat": 45,
  "Overhead Press OHP": 45,
  "Bench Press": 45,
  "Deadlift": 95,
  "Power clean": 65
};

const increments = {
  "Squat": 5,
  "Overhead Press OHP": 5,
  "Bench Press": 5,
  "Deadlift": 10,
  "Power clean": 5
};

//
// Generates the next Starting Strength workout.
// @param {Array} workoutHistory - Array of previous workout objects
// @param {string|null} lastExecutionMessage - e.g., "Workout A"
//  @returns {Object} { nextWorkout: workout, lastExecutionMessage: string }
//
const getNextStartingStrengthWorkout = (workoutHistory, lastExecutionMessage) => {
  let nextType = "A";
  if (lastExecutionMessage) {
    const lastType = lastExecutionMessage.includes("Workout A") ? "A" : "B";
    nextType = lastType === "A" ? "B" : "A";
  }

  const getLastWeight = (exerciseName) => {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
      const exercise = workoutHistory[i].exercises.find(e => e.name === exerciseName);
      if (exercise && exercise.sets.length > 0) {
        return exercise.sets[0].weight;
      }
    }
    return null; 
  };

  const exerciseNames = (nextType === "A") 
    ? ["Squat", "Overhead Press OHP", "Deadlift"] 
    : ["Squat", "Bench Press", "Power clean"];

  const nextExercises = exerciseNames.map(name => {
    const lastWeight = getLastWeight(name);
    
    const weight = lastWeight !== null 
      ? lastWeight + (increments[name] || 5) 
      : (INITIAL_WEIGHTS[name] || 45);
    
    const numSets = (name === "Deadlift") ? 1 : (name === "Power clean" ? 5 : 3);
    const repsPerSet = (name === "Power clean") ? 3 : 5;

    return {
      name,
      sets: Array(numSets).fill({ weight, reps: repsPerSet })
    };
  });

  return {
    nextWorkout: {
      date: new Date().toISOString().split('T')[0], // Returns YYYY-MM-DD
      exercises: nextExercises
    },
    lastExecutionMessage: \`Workout \${nextType}\`
  };
};

return getNextStartingStrengthWorkout;
`

};

const ScriptsPage = () => {
  const { currentUser } = useAuth();
  const { darkMode } = useApp();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [selectedScript, setSelectedScript] = useState<Script>(emptyScript);
  const [editingScriptIndex, setEditingScriptIndex] = useState<number | null>(null);
  const [executingScriptId, setExecutingScriptId] = useState<string | null>(null);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<ScriptExecutionResult[]>([]);
  const [debugProgress, setDebugProgress] = useState<{ current: number; total: number } | null>(null);
  const [unknownExercises, setUnknownExercises] = useState<string[]>([]);

  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery({
    queryKey: ['scripts', currentUser?.uid],
    queryFn: async () => {
      const fetched = await getScripts(currentUser!.uid);
      return ensureIds(fetched);
    },
    enabled: !!currentUser,
    retry: false,
    meta: {
      onError: (error: Error) => {
        console.error('Error fetching scripts:', error);
        setSnackbarMessage('Error loading scripts. Please check your permissions.');
        setSnackbarSeverity('error');
        setShowSnackbar(true);
      },
    },
  });

  const { data: customExercises = [] } = useQuery({
    queryKey: ['customExercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });

  const mutation = useMutation({
    mutationFn: async (updatedScripts: Script[]) => {
      await saveScripts(currentUser!.uid, updatedScripts);
    },
    onSuccess: () => {
      setSnackbarMessage('Scripts saved successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['scripts', currentUser?.uid] });
    },
    onError: (error) => {
      console.error('Error saving scripts:', error);
      setSnackbarMessage('Error saving scripts.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
  });

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined && scripts[index]) {
      setSelectedScript(JSON.parse(JSON.stringify(scripts[index])));
      setEditingScriptIndex(index);
    } else {
      setSelectedScript(emptyScript);
      setEditingScriptIndex(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingScriptIndex(null);
  };

  const handleSaveScript = () => {
    const newName = selectedScript.name.trim();
    if (newName === '') {
      setSnackbarMessage('Script name cannot be empty.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    }

    const newScripts = [...scripts];
    const scriptToSave = {
      ...selectedScript,
      id: selectedScript.id || generateId(),
    };

    if (editingScriptIndex !== null) {
      newScripts[editingScriptIndex] = scriptToSave;
    } else {
      newScripts.push(scriptToSave);
    }
    mutation.mutate(newScripts);
  };

  const handleExecuteScript = async (script: Script, debug: boolean = false) => {
    if (!currentUser) return;

    setExecutingScriptId(script.id || null);
    setDebugResults([]);
    setDebugProgress(null);
    try {
      const history = await getWorkoutsForUser(currentUser.uid);

      if (debug) {
        const total = 25;
        const results: ScriptExecutionResult[] = [];
        let currentMessage = script.lastExecutionMessage;
        const currentHistory = [...history];
        const allKnownExercises = new Set([
          ...builtInExercises,
          ...customExercises.map(ce => ce.name)
        ]);
        const foundUnknown = new Set<string>();

        setIsDebugDialogOpen(true); // Open early to show progress
        setDebugProgress({ current: 0, total });
        setUnknownExercises([]); // Reset

        for (let i = 0; i < total; i++) {
          setDebugProgress({ current: i + 1, total });
          const result = await executeScript({ ...script, lastExecutionMessage: currentMessage }, currentHistory);

          // Check for unknown exercises
          result.workout.exercises.forEach(ex => {
            if (!allKnownExercises.has(ex.name)) {
              foundUnknown.add(ex.name);
            }
          });
          setUnknownExercises(Array.from(foundUnknown));

          results.push(result);
          setDebugResults([...results]); // Update UI progressively
          currentMessage = result.message || '';

          // Add generated workout to temporary history for next iteration
          const simulatedWorkout: Workout = {
            ...result.workout,
            id: `sim-${i}`,
            date: new Date(result.workout.date)
          };
          currentHistory.push(simulatedWorkout);
        }
        setDebugProgress(null);
        return;
      }

      const result = await executeScript(script, history);

      // Save updated lastExecutionMessage if provided
      if (result.message !== script.lastExecutionMessage) {
        const updatedScripts = scripts.map((s) =>
          s.id === script.id
            ? { ...s, lastExecutionMessage: result.message || '' }
            : s
        );
        mutation.mutate(updatedScripts);
      }

      // Save workout to localStorage and navigate to /workout
      localStorage.setItem('liftly-currentWorkout', JSON.stringify({ ...result.workout, title: script.name }));
      navigate('/workout');
    } catch (error: unknown) {
      console.error('Error executing script:', error);
      if (debug) {
        setDebugResults(prev => [...prev, {
          workout: { date: new Date(), exercises: [] },
          logs: (error as Error & { logs?: string[] }).logs || [],
          rawResult: 'Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        }]);
        setDebugProgress(null);
      } else {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setSnackbarMessage(`Execution failed: ${message}`);
        setSnackbarSeverity('error');
        setShowSnackbar(true);
      }
    } finally {
      if (!debug) {
        setExecutingScriptId(null);
      }
    }
  };

  const handleDeleteScript = (index: number) => {
    if (window.confirm('Are you sure you want to delete this script?')) {
      const updatedScripts = scripts.filter((_, i) => i !== index);
      mutation.mutate(updatedScripts);
    }
  };

  const handleCloseSnackbar = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  return (
    <Container sx={{ mt: 2, mb: 4 }}>
      {isLoadingScripts ? (
        <CircularProgress />
      ) : (
        <Stack spacing={1}>
          {scripts.map((script, index) => (
            <Card key={script.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    {script.name}
                  </Typography>
                  {script.lastExecutionMessage && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Last: {script.lastExecutionMessage}
                    </Typography>
                  )}
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => handleExecuteScript(script, true)}
                    disabled={executingScriptId !== null}
                    color="info"
                    title="Debug Script"
                  >
                    <BugReportIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleExecuteScript(script)}
                    disabled={executingScriptId !== null}
                    color="primary"
                    title="Execute Script"
                  >
                    {executingScriptId === script.id ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <PlayArrowIcon fontSize="small" />
                    )}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(index)}
                    title="Edit Script"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteScript(index)}
                    color="error"
                    title="Delete Script"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Button
        variant="contained"
        onClick={() => handleOpenDialog()}
        sx={{ mt: 3 }}
      >
        Create New Script
      </Button>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editingScriptIndex !== null ? 'Edit Script' : 'Create New Script'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Script Name"
            fullWidth
            variant="outlined"
            value={selectedScript.name}
            onChange={(e) =>
              setSelectedScript({ ...selectedScript, name: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Last Execution Message"
            fullWidth
            variant="outlined"
            value={selectedScript.lastExecutionMessage || ''}
            onChange={(e) =>
              setSelectedScript({ ...selectedScript, lastExecutionMessage: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            JavaScript Code
          </Typography>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
              </Box>
            }>
              <Editor
                height="400px"
                defaultLanguage="javascript"
                value={selectedScript.code}
                theme={darkMode === 'dark' ? 'vs-dark' : 'light'}
                onChange={(value) =>
                  setSelectedScript({ ...selectedScript, code: value || '' })
                }
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </Suspense>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveScript} variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDebugDialogOpen}
        onClose={() => {
          setIsDebugDialogOpen(false);
          setExecutingScriptId(null);
        }}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          Script Debug Output
          {debugProgress && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} variant="determinate" value={(debugProgress.current / debugProgress.total) * 100} />
              <Typography variant="caption">
                Generating {debugProgress.current}/{debugProgress.total}...
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          {debugResults.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: 50 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 150 }}>Message</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Workout Summary</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 300 }}>Logs</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {debugResults.map((result, i) => (
                      <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 }, verticalAlign: 'top' }}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                            {new Date(result.workout.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            {result.message}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            {result.workout.exercises.map((ex, ei) => (
                              <Box key={ei}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  {ex.name}:
                                </Typography>{' '}
                                <Typography variant="caption">
                                  {ex.sets.map((s) => `${s.weight}x${s.reps}`).join(', ')}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                          {typeof result.rawResult === 'string' && result.rawResult.startsWith('Execution failed') && (
                            <Typography color="error" variant="caption">
                              {result.rawResult}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{
                            bgcolor: 'grey.900',
                            color: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxHeight: '150px',
                            overflow: 'auto'
                          }}>
                            {result.logs && result.logs.length > 0 ? (
                              result.logs.map((log: string, li: number) => <div key={li} style={{ whiteSpace: 'pre-wrap' }}>{log}</div>)
                            ) : (
                              <Typography variant="caption" sx={{ fontStyle: 'italic', opacity: 0.5 }}>No logs</Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {unknownExercises.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Unknown Exercises Detected:
                  </Typography>
                  <Typography variant="body2">
                    {unknownExercises.join(', ')}
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            !debugProgress && <Typography variant="body2">No results to display.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsDebugDialogOpen(false);
            setExecutingScriptId(null);
          }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ScriptsPage;
