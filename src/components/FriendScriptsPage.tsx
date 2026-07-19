import React, { useState, lazy, Suspense } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BugReportIcon from '@mui/icons-material/BugReport';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CodeIcon from '@mui/icons-material/Code';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import { useApp } from '../contexts/app-context-utils';
import type { Script, Workout } from '../types';
import { exercises as builtInExercises } from '../data/exercises';
import {
  getScripts,
  saveScripts,
  getUserProfile,
  getWorkoutsForUser,
  executeScript,
  getCustomExercises,
  type ScriptExecutionResult,
} from '../utils';

const Editor = lazy(() => import('@monaco-editor/react'));

const FriendScriptsPage: React.FC = () => {
  const { friendUid } = useParams<{ friendUid: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { darkMode } = useApp();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [executingScriptId, setExecutingScriptId] = useState<string | null>(null);
  const [isDebugDialogOpen, setIsDebugDialogOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<ScriptExecutionResult[]>([]);
  const [debugProgress, setDebugProgress] = useState<{ current: number; total: number } | null>(null);
  const [unknownExercises, setUnknownExercises] = useState<string[]>([]);

  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const { data: profile } = useQuery({
    queryKey: ['friendProfile', friendUid],
    queryFn: () => getUserProfile(friendUid!),
    enabled: !!friendUid,
  });

  const {
    data: scripts = [],
    isLoading: isLoadingScripts,
    error: errorScripts,
  } = useQuery({
    queryKey: ['scripts', friendUid],
    queryFn: () => getScripts(friendUid!),
    enabled: !!friendUid,
  });

  const { data: customExercises = [] } = useQuery({
    queryKey: ['customExercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });

  const friendName = profile?.displayName ?? 'Friend';

  const importMutation = useMutation({
    mutationFn: async (scriptToImport: Script) => {
      if (!currentUser) return;
      const myScripts = await getScripts(currentUser.uid);
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const newScript: Script = {
        ...scriptToImport,
        id: uniqueId,
        name: `${scriptToImport.name} (from ${friendName})`,
      };
      await saveScripts(currentUser.uid, [...myScripts, newScript]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts', currentUser?.uid] });
      setSnackbarMessage('Script imported successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
    },
    onError: (err) => {
      console.error(err);
      setSnackbarMessage('Failed to import script.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
  });

  const handleToggleCode = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
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
          ...customExercises.map((ce) => ce.name),
        ]);
        const foundUnknown = new Set<string>();

        setIsDebugDialogOpen(true);
        setDebugProgress({ current: 0, total });
        setUnknownExercises([]);

        for (let i = 0; i < total; i++) {
          setDebugProgress({ current: i + 1, total });
          const result = await executeScript(
            { ...script, lastExecutionMessage: currentMessage },
            currentHistory
          );

          result.workout.exercises.forEach((ex) => {
            if (!allKnownExercises.has(ex.name)) {
              foundUnknown.add(ex.name);
            }
          });
          setUnknownExercises(Array.from(foundUnknown));

          results.push(result);
          setDebugResults([...results]);
          currentMessage = result.message || '';

          const simulatedWorkout: Workout = {
            ...result.workout,
            id: `sim-${i}`,
            date: new Date(result.workout.date),
          };
          currentHistory.push(simulatedWorkout);
        }
        setDebugProgress(null);
        return;
      }

      const result = await executeScript(script, history);

      localStorage.setItem('liftly-currentWorkout', JSON.stringify({ ...result.workout, title: script.name }));
      navigate('/workout');
    } catch (error: unknown) {
      console.error('Error executing script:', error);
      if (debug) {
        setDebugResults((prev) => [
          ...prev,
          {
            workout: { date: new Date(), exercises: [] },
            logs: (error as Error & { logs?: string[] }).logs || [],
            rawResult: 'Execution failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
          },
        ]);
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

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/friends')}
        sx={{ mb: 2 }}
        id="back-to-friends-btn"
      >
        Back to Friends
      </Button>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6">{friendName}'s Scripts</Typography>
        <Typography variant="body2" color="text.secondary">(read-only)</Typography>
      </Paper>

      {isLoadingScripts && <CircularProgress />}
      {errorScripts && <Alert severity="error">{(errorScripts as Error).message}</Alert>}

      {!isLoadingScripts && scripts.length === 0 && (
        <Typography color="text.secondary">No scripts shared by this friend.</Typography>
      )}

      {!isLoadingScripts && scripts.length > 0 && (
        <Stack spacing={2}>
          {scripts.map((script) => {
            const scriptId = script.id || script.name;
            const isCodeExpanded = expandedId === scriptId;

            return (
              <Card key={scriptId} variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                        {script.name}
                      </Typography>
                      {script.lastExecutionMessage && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Last Message: {script.lastExecutionMessage}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Debug Script (Simulate 25 runs)">
                        <IconButton
                          color="info"
                          onClick={() => handleExecuteScript(script, true)}
                          disabled={executingScriptId !== null}
                          id={`debug-script-${scriptId}`}
                        >
                          <BugReportIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Execute Script & Start Workout">
                        <span>
                          <IconButton
                            color="primary"
                            onClick={() => handleExecuteScript(script)}
                            disabled={executingScriptId !== null}
                            id={`execute-script-${scriptId}`}
                          >
                            {executingScriptId === script.id ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              <PlayArrowIcon />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Import to My Scripts">
                        <span>
                          <IconButton
                            color="secondary"
                            onClick={() => importMutation.mutate(script)}
                            disabled={importMutation.isPending}
                            id={`import-script-${scriptId}`}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Show JavaScript Code">
                        <IconButton
                          onClick={() => handleToggleCode(scriptId)}
                          id={`toggle-code-${scriptId}`}
                        >
                          <CodeIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </CardContent>

                <Collapse in={isCodeExpanded} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      JavaScript Code (read-only)
                    </Typography>
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                      <Suspense
                        fallback={
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                            <CircularProgress />
                          </Box>
                        }
                      >
                        <Editor
                          height="300px"
                          defaultLanguage="javascript"
                          value={script.code}
                          theme={darkMode === 'dark' ? 'vs-dark' : 'light'}
                          options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                          }}
                        />
                      </Suspense>
                    </Box>
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

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
          Script Debug Output (Friend's Script on Your History)
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

      <Snackbar
        open={showSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FriendScriptsPage;
