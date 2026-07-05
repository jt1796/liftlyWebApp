import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import type { Template, Exercise } from '../types';
import {
  getTemplates,
  saveTemplates,
  getUserProfile,
  getWorkoutsForUser,
  getLatestExercisePRs,
} from '../utils';

const FriendTemplatesPage: React.FC = () => {
  const { friendUid } = useParams<{ friendUid: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isRmDialogOpen, setIsRmDialogOpen] = useState(false);
  const [rmsToUse, setRmsToUse] = useState<Record<string, number>>({});

  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const { data: profile } = useQuery({
    queryKey: ['friendProfile', friendUid],
    queryFn: () => getUserProfile(friendUid!),
    enabled: !!friendUid,
  });

  const {
    data: templates = [],
    isLoading: isLoadingTemplates,
    error: errorTemplates,
  } = useQuery({
    queryKey: ['templates', friendUid],
    queryFn: () => getTemplates(friendUid!),
    enabled: !!friendUid,
  });

  const { data: myWorkouts = [] } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const friendName = profile?.displayName ?? 'Friend';

  const importMutation = useMutation({
    mutationFn: async (templateToImport: Template) => {
      if (!currentUser) return;
      const myTemplates = await getTemplates(currentUser.uid);
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const newTemplate: Template = {
        ...templateToImport,
        id: uniqueId,
        name: `${templateToImport.name} (from ${friendName})`,
      };
      await saveTemplates(currentUser.uid, [...myTemplates, newTemplate]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', currentUser?.uid] });
      setSnackbarMessage('Template imported successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
    },
    onError: (err) => {
      console.error(err);
      setSnackbarMessage('Failed to import template.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleStartWorkoutClick = (template: Template) => {
    setSelectedTemplate(template);
    const uniqueExercises = Array.from(new Set(template.exercises.map((e) => e.name)));
    const initialRms: Record<string, number> = {};
    uniqueExercises.forEach((exName) => {
      const latestPRs = getLatestExercisePRs(myWorkouts, exName);
      initialRms[exName] = latestPRs.e1rm?.value || 0;
    });
    setRmsToUse(initialRms);
    setIsRmDialogOpen(true);
  };

  const handleConfirmStartWorkout = () => {
    if (!selectedTemplate) return;
    const workoutFromTemplate = {
      date: new Date(),
      exercises: selectedTemplate.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weight: Math.round(((set.weight / 100) * (rmsToUse[exercise.name] || 0)) / 5) * 5, // Round to nearest 5
        })),
      })),
    };
    localStorage.setItem('liftly-currentWorkout', JSON.stringify(workoutFromTemplate));
    navigate('/workout');
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
        <Typography variant="h6">{friendName}'s Templates</Typography>
        <Typography variant="body2" color="text.secondary">(read-only)</Typography>
      </Paper>

      {isLoadingTemplates && <CircularProgress />}
      {errorTemplates && <Alert severity="error">{(errorTemplates as Error).message}</Alert>}

      {!isLoadingTemplates && templates.length === 0 && (
        <Typography color="text.secondary">No templates shared by this friend.</Typography>
      )}

      {!isLoadingTemplates && templates.length > 0 && (
        <Stack spacing={2}>
          {templates.map((template) => {
            const templateId = template.id || template.name;
            const isExpanded = expandedId === templateId;

            return (
              <Card key={templateId} variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                        {template.name}
                      </Typography>
                      <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Exercises:
                        </Typography>
                        {template.exercises.map((exercise, index) => (
                          <Chip
                            key={index}
                            label={exercise.name}
                            size="small"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Start Workout from template">
                        <IconButton
                          color="primary"
                          onClick={() => handleStartWorkoutClick(template)}
                          id={`start-workout-${templateId}`}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Import to My Templates">
                        <span>
                          <IconButton
                            color="secondary"
                            onClick={() => importMutation.mutate(template)}
                            disabled={importMutation.isPending}
                            id={`import-template-${templateId}`}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton
                        onClick={() => handleToggleExpand(templateId)}
                        id={`toggle-expand-${templateId}`}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Stack>
                  </Box>
                </CardContent>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ my: 1 }} />
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Exercise</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Sets</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Target Detail (%1RM × Reps)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {template.exercises.map((exercise: Exercise, exIndex) => (
                            <TableRow key={exIndex} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              <TableCell sx={{ fontWeight: 500 }}>{exercise.name}</TableCell>
                              <TableCell align="right">{exercise.sets.length}</TableCell>
                              <TableCell>
                                {exercise.sets.map((set, setIndex) => (
                                  <Chip
                                    key={setIndex}
                                    label={`${set.weight}% × ${set.reps} reps`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}

      {selectedTemplate && (
        <Dialog open={isRmDialogOpen} onClose={() => setIsRmDialogOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle>Enter 1RMs for Workout</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your current 1 Rep Max for each exercise to calculate the weights for this session.
            </Typography>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {Object.keys(rmsToUse).map((exName) => (
                <TextField
                  key={exName}
                  label={`${exName} 1RM`}
                  type="number"
                  value={rmsToUse[exName]}
                  onChange={(e) =>
                    setRmsToUse({ ...rmsToUse, [exName]: parseFloat(e.target.value) || 0 })
                  }
                  fullWidth
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsRmDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmStartWorkout} variant="contained" color="primary">
              Start
            </Button>
          </DialogActions>
        </Dialog>
      )}

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

export default FriendTemplatesPage;
