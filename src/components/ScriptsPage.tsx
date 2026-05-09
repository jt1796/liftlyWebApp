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
import { useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import type { Script, Workout } from '../types';
import {
  getScripts,
  saveScripts,
  getWorkoutsForUser,
  executeScript,
  type ScriptExecutionResult
} from '../utils';

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
  code: `Paste this into gemini or chatgpt except for this line. 

create a javascript function that returns the next <name of the workout program> workout based on:
- the workout history of the user, and 
- lastExecutionMessage from the last time this script was executed

workout type structure:
{
  date: new Date(),
  exercises: [{
    name: "Bench Press",
    sets: [{ weight: 100, reps: 5 }]
  }],
}

lastExecutionMessage type structure:
"Week 1 Day 1"

Create a javascript statement that returns a function of type: (workoutHistory: workout[], lastExecutionMessage: string?) => { nextWorkout: workout, lastExecutionMessage: string }

Example output: return (workoutHistory, lastExecutionMessage) => { ... }
`

};

const ScriptsPage = () => {
  const { currentUser } = useAuth();
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

        setIsDebugDialogOpen(true); // Open early to show progress
        setDebugProgress({ current: 0, total });

        for (let i = 0; i < total; i++) {
          setDebugProgress({ current: i + 1, total });
          const result = await executeScript({ ...script, lastExecutionMessage: currentMessage }, currentHistory);
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
      localStorage.setItem('liftly-currentWorkout', JSON.stringify(result.workout));
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
            label="JavaScript Code"
            multiline
            rows={15}
            fullWidth
            variant="outlined"
            value={selectedScript.code}
            onChange={(e) =>
              setSelectedScript({ ...selectedScript, code: e.target.value })
            }
            slotProps={{
              input: {
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                }
              }
            }}
          />
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
