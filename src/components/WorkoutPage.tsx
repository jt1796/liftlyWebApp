import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Workout, Exercise, Set, Template } from '../types';
import { exercises as exerciseList } from '../data/exercises';
import {
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  FormControl,
  Box,
  CircularProgress,
  Stack,
  Autocomplete,
  Alert,
  Snackbar,
  ButtonGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  getWorkoutById,
  calculateOneRepMax,
  findSetToPR,
  getE1RmSuggestions,
  getCustomExercises,
  getWorkoutsForUser,
  createFilterOptions,
  workoutToText,
  getExerciseHistory,
  getPRDetailsForWorkout,
  calculateTotalWorkoutWeight,
  getWorkoutWeightObject,
  type SetPRDetails,
  getTemplates,
  saveTemplates,
  workoutToTemplate,
} from '../utils';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/auth-context-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomExercise } from '../types';
import ExerciseHistoryDialog from './ExerciseHistoryDialog';

const localStorageKey = 'liftly-currentWorkout';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const ensureIds = (workoutData: Workout): Workout => {
  return {
    ...workoutData,
    exercises: workoutData.exercises.map((ex) => ({
      ...ex,
      id: ex.id || generateId(),
      sets: ex.sets.map((set) => ({
        ...set,
        id: set.id || generateId(),
      })),
    })),
  };
};

const WorkoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [e1rmSuggestions, setE1rmSuggestions] = useState<Record<string, number>>({});
  const [isE1RMLoading, setIsE1RMLoading] = useState(false);
  const [exerciseHistory, setExerciseHistory] = useState<(Workout & { exercise: Exercise; })[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyExerciseName, setHistoryExerciseName] = useState('');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<Template | null>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const {
    data: fetchedWorkout,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workout', id],
    queryFn: () => getWorkoutById(id!),
    enabled: !!id,
  });

  const { data: customExercises = [] } = useQuery({
    queryKey: ['custom-exercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });

  const combinedExercises = useMemo(() => {
    return [
      ...exerciseList,
      ...customExercises.map((ex: CustomExercise) => ex.name),
    ];
  }, [customExercises]);

  const filterExerciseOptions = useMemo(() => createFilterOptions(combinedExercises), [combinedExercises]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!workout) return;

    const newExercises = Array.from(workout.exercises);

    if (type === 'exercise') {
      const [removed] = newExercises.splice(source.index, 1);
      newExercises.splice(destination.index, 0, removed);
      setWorkout({ ...workout, exercises: newExercises });
    } else {
      // It's a set
      const sourceExerciseId = source.droppableId.replace('sets-', '');
      const destExerciseId = destination.droppableId.replace('sets-', '');

      const sourceExIndex = newExercises.findIndex(ex => ex.id === sourceExerciseId);
      const destExIndex = newExercises.findIndex(ex => ex.id === destExerciseId);

      if (sourceExIndex === -1 || destExIndex === -1) return;

      const sourceSets = Array.from(newExercises[sourceExIndex].sets);
      const destSets = sourceExIndex === destExIndex ? sourceSets : Array.from(newExercises[destExIndex].sets);

      const [removed] = sourceSets.splice(source.index, 1);
      destSets.splice(destination.index, 0, removed);

      newExercises[sourceExIndex] = { ...newExercises[sourceExIndex], sets: sourceSets };
      if (sourceExIndex !== destExIndex) {
        newExercises[destExIndex] = { ...newExercises[destExIndex], sets: destSets };
      }

      setWorkout({ ...workout, exercises: newExercises });
    }
  };

  useEffect(() => {
    if (id) {
      if (fetchedWorkout) {
        setWorkout(ensureIds(fetchedWorkout));
      }
    } else {
      try {
        const storedWorkout = localStorage.getItem(localStorageKey);
        if (storedWorkout) {
          const parsedWorkout = JSON.parse(storedWorkout);
          const storedDate = new Date(parsedWorkout.date);
          const now = new Date();
          const threeHours = 3 * 60 * 60 * 1000;

          if (now.getTime() - storedDate.getTime() > threeHours) {
            parsedWorkout.date = now;
          } else {
            parsedWorkout.date = storedDate;
          }
          setWorkout(ensureIds(parsedWorkout as Workout));
        } else {
          setWorkout({
            date: new Date(),
            exercises: [],
          });
        }
      } catch (error) {
        console.error('Failed to parse workout from localStorage', error);
        setWorkout({
          date: new Date(),
          exercises: [],
        });
      }
    }
  }, [id, fetchedWorkout]);


  useEffect(() => {
    if (workout && !id) {
      localStorage.setItem(localStorageKey, JSON.stringify(workout));
    }
  }, [workout, id]);

  const { data: allWorkouts } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const prDetails = useMemo(() => {
    if (!workout || !allWorkouts) {
      return {
        setPRDetails: {} as Record<string, SetPRDetails>,
        workoutPRList: [] as { exerciseName: string; type: 'E1RM' | 'Max Weight'; value: number; oldValue: number | null }[],
        workoutPRCount: 0,
      };
    }
    return getPRDetailsForWorkout(workout, allWorkouts);
  }, [workout, allWorkouts]);

  const totalWeight = useMemo(() => {
    return workout ? calculateTotalWorkoutWeight(workout) : 0;
  }, [workout]);

  const weightObj = useMemo(() => {
    return getWorkoutWeightObject(totalWeight);
  }, [totalWeight]);

  const handleShowHistory = (exerciseName: string) => {
    if (allWorkouts) {
      const history = getExerciseHistory(allWorkouts, exerciseName);
      setExerciseHistory(history);
      setHistoryExerciseName(exerciseName);
      setIsHistoryDialogOpen(true);
    }
  };

  useEffect(() => {
    if (!currentUser || !workout || !allWorkouts) {
      setE1rmSuggestions({});
      return;
    }

    setIsE1RMLoading(true);
    try {
      const suggestions = getE1RmSuggestions(allWorkouts, workout);
      setE1rmSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching E1RM suggestions:', error);
      setE1rmSuggestions({});
    } finally {
      setIsE1RMLoading(false);
    }
  }, [currentUser, workout, allWorkouts]);


  const handleDeleteWorkout = async () => {
    if (!currentUser || !id) {
      console.error('User not logged in or workout ID is missing.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this workout?')) {
      return;
    }

    try {
      setIsSaving(true);
      const workoutDocRef = doc(db, 'workouts', id);
      await deleteDoc(workoutDocRef);
      await queryClient.invalidateQueries({ queryKey: ['workouts', currentUser.uid] });
      navigate('/workouts');
    } catch (error) {
      console.error('Error deleting workout:', error);
      setSnackbarMessage('Error saving workout.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorkout = async () => {
    if (!currentUser || !workout) {
      console.error('User not logged in or workout data is missing.');
      return;
    }

    setIsSaving(true);
    try {
      const workoutData = {
        ...workout,
        userId: currentUser.uid,
      };

      if (id) {
        const workoutDocRef = doc(db, 'workouts', id);
        await setDoc(workoutDocRef, workoutData);
        await queryClient.invalidateQueries({ queryKey: ['workouts', currentUser.uid] });
        await queryClient.invalidateQueries({ queryKey: ['workout', id] });
        navigate(`/workout/${id}`);
        setSnackbarMessage('Workout updated successfully!');
      } else {
        const res = await addDoc(collection(db, 'workouts'), workoutData);
        await queryClient.invalidateQueries({ queryKey: ['workouts', currentUser.uid] });
        localStorage.removeItem(localStorageKey);
        navigate(`/workout/${res.id}`);
        setSnackbarMessage('Workout created successfully!');
      }
      setSnackbarSeverity('success');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error saving workout:', error);
      setSnackbarMessage('Error saving workout.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTemplateClick = () => {
    if (!workout) return;
    const defaultName = `Template from ${dayjs(workout.date).format('MMMM D, YYYY')}`;
    const draft = workoutToTemplate(workout, defaultName);
    setTemplateDraft(draft);
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!currentUser || !templateDraft) return;

    const name = templateDraft.name.trim();
    if (!name) {
      setSnackbarMessage('Template name cannot be empty.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    }

    setIsSavingTemplate(true);
    try {
      const existingTemplates = await getTemplates(currentUser.uid);
      const updatedTemplates = [...existingTemplates, templateDraft];
      await saveTemplates(currentUser.uid, updatedTemplates);

      await queryClient.invalidateQueries({ queryKey: ['templates', currentUser.uid] });

      setSnackbarMessage(`Template "${name}" created successfully!`);
      setSnackbarSeverity('success');
      setShowSnackbar(true);
      setIsTemplateDialogOpen(false);
    } catch (error) {
      console.error('Error saving template:', error);
      setSnackbarMessage('Error creating template.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const unknownExercises = useMemo(() => {
    if (!workout) return [];
    const uniqueUnknowns = new Set(
      workout.exercises
        .map((ex) => ex.name)
        .filter((name) => name && !combinedExercises.includes(name))
    );
    return Array.from(uniqueUnknowns);
  }, [workout, combinedExercises]);

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  const handleCopyWorkout = (format: 'txt' | 'phpbb') => {
    if (!workout) return;

    const fullWorkoutText = workoutToText(workout, format, allWorkouts || []);
    navigator.clipboard.writeText(fullWorkoutText).then(
      () => {
        setSnackbarMessage(`Workout copied as ${format.toUpperCase()}!`);
        setSnackbarSeverity('success');
        setShowSnackbar(true);
      },
      (err) => {
        console.error('Failed to copy workout: ', err);
        setSnackbarMessage('Failed to copy workout.');
        setSnackbarSeverity('error');
        setShowSnackbar(true);
      }
    );

  }

  const handleExerciseChange = (index: number, field: keyof Exercise, value: string) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setWorkout({ ...workout, exercises: newExercises });
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof Set, value: number) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    const newSets = [...newExercises[exerciseIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
    setWorkout({ ...workout, exercises: newExercises });
  };

  const addExercise = () => {
    if (!workout) return;
    const newExercise: Exercise = {
      id: generateId(),
      name: combinedExercises[0],
      sets: [],
    };
    setWorkout({ ...workout, exercises: [...workout.exercises, newExercise] });
  };

  const addSet = (exerciseIndex: number) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    const newSet: Set = { id: generateId(), weight: 0, reps: 0 };

    const exerciseSets = newExercises[exerciseIndex].sets;
    if (exerciseSets.length > 0) {
      newSet.weight = exerciseSets[exerciseSets.length - 1].weight;
    }

    newExercises[exerciseIndex].sets.push(newSet);
    setWorkout({ ...workout, exercises: newExercises });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setWorkout({ ...workout, exercises: newExercises });
  };

  const removeExercise = (exerciseIndex: number) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    newExercises.splice(exerciseIndex, 1);
    setWorkout({ ...workout, exercises: newExercises });
  };

  const handleAddPRSet = (exerciseIndex: number) => {
    if (!workout) return;
    const exerciseName = workout.exercises[exerciseIndex].name;
    const targetE1RM = e1rmSuggestions[exerciseName];

    if (targetE1RM) {
      const suggestedSet = findSetToPR(targetE1RM, exerciseName);
      if (suggestedSet) {
        const newExercises = [...workout.exercises];
        const newSetWithId = { ...suggestedSet, id: generateId() };
        newExercises[exerciseIndex].sets.push(newSetWithId);
        setWorkout({ ...workout, exercises: newExercises });
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{(error as Error).message}</Alert>
      </Container>
    );
  }

  if (!workout) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {id ? 'Edit Workout' : 'Create Workout'}
          {prDetails.workoutPRCount > 0 && (
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.75rem' }}>
                    Personal Records Broken:
                  </Typography>
                  {prDetails.workoutPRList.map((pr, index) => (
                    <Typography key={index} variant="caption" display="block">
                      • {pr.exerciseName} ({pr.type === 'E1RM' ? 'E1RM' : 'Max Weight'}): {pr.oldValue} → {pr.value} lbs
                    </Typography>
                  ))}
                </Box>
              }
              arrow
            >
              <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                <WorkspacePremiumIcon sx={{ color: '#FFD700', fontSize: '2rem' }} />
                {prDetails.workoutPRCount > 1 && (
                  <Typography
                    component="sup"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: '#FFD700',
                      ml: 0.25,
                      alignSelf: 'flex-start',
                      lineHeight: 1,
                      mt: -0.25,
                    }}
                  >
                    {prDetails.workoutPRCount}
                  </Typography>
                )}
              </Box>
            </Tooltip>
          )}
          {totalWeight > 0 && (
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                    Total Weight Lifted:
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                    {totalWeight.toLocaleString()} lbs
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                    Equivalent to a {weightObj.name} ({weightObj.weight >= 1 ? `${weightObj.weight.toLocaleString()} lbs` : `${weightObj.weight} lbs`})
                  </Typography>
                </Box>
              }
              arrow
            >
              <Typography
                component="span"
                sx={{ fontSize: '2rem', cursor: 'default', display: 'inline-flex', alignItems: 'center' }}
              >
                {weightObj.emoji}
              </Typography>
            </Tooltip>
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ButtonGroup variant="outlined" aria-label="outlined button group" size="small">
            <Button startIcon={<ContentCopyIcon />} onClick={() => handleCopyWorkout('txt')}>txt</Button>
            <Button startIcon={<ContentCopyIcon />} onClick={() => handleCopyWorkout('phpbb')}>phpbb</Button>
          </ButtonGroup>
        </Box>
      </Box>
      <Stack spacing={3} sx={{ mb: 3 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateTimePicker
            label="Date"
            value={dayjs(workout.date)}
            onChange={(e) => e && setWorkout({ ...workout, date: e.toDate() })}
          />
        </LocalizationProvider>
      </Stack>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="exercises" type="exercise">
          {(provided) => (
            <Box {...provided.droppableProps} ref={provided.innerRef}>
              {workout.exercises.map((exercise, exerciseIndex) => (
                <Draggable key={exercise.id} draggableId={exercise.id!} index={exerciseIndex}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      sx={{ mt: 3 }}
                    >
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box {...provided.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', ml: -1 }}>
                            <DragIndicatorIcon color="action" />
                          </Box>
                          <FormControl fullWidth>
                            <Autocomplete
                              value={exercise.name}
                              options={combinedExercises}
                              filterOptions={filterExerciseOptions}
                              onChange={(_, value) => handleExerciseChange(exerciseIndex, 'name', value!)}
                              renderInput={(params) => <TextField {...params} label="Exercise" />}
                            />
                          </FormControl>
                          <IconButton onClick={() => removeExercise(exerciseIndex)} color="error" size="small">
                            <DeleteIcon />
                          </IconButton>
                        </Stack>

                        <Droppable droppableId={`sets-${exercise.id}`} type="set">
                          {(provided) => (
                            <Box {...provided.droppableProps} ref={provided.innerRef} sx={{ minHeight: '10px' }}>
                              {exercise.sets.map((set, setIndex) => (
                                <Draggable key={set.id} draggableId={set.id!} index={setIndex}>
                                  {(provided) => (
                                    <Stack
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      direction="row"
                                      spacing={2}
                                      alignItems="center"
                                      sx={{ mt: 2 }}
                                      justifyContent="space-between"
                                    >
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box {...provided.dragHandleProps} sx={{ display: 'flex', alignItems: 'center', cursor: 'grab', ml: -1 }}>
                                          <DragIndicatorIcon fontSize="small" color="action" />
                                        </Box>
                                        <TextField
                                          type="number"
                                          label="Weight"
                                          value={set.weight}
                                          sx={{ maxWidth: '75px' }}
                                          onFocus={e => e.target.select()}
                                          InputProps={{
                                            inputProps: { min: 0 }
                                          }}
                                          onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value))}
                                        />
                                        <TextField
                                          type="number"
                                          label="Reps"
                                          value={set.reps}
                                          sx={{ maxWidth: '75px' }}
                                          onFocus={e => e.target.select()}
                                          InputProps={{
                                            inputProps: { min: 0 }
                                          }}
                                          error={set.reps === 0}
                                          onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value))}
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                          <Box sx={{ minWidth: '60px', textAlign: 'center' }}>
                                            <Typography variant="body2">
                                              {calculateOneRepMax(set.weight, set.reps)}
                                            </Typography>
                                            <Typography variant="caption" sx={{ lineHeight: 1, fontSize: 6 }}>
                                              E1RM
                                            </Typography>
                                          </Box>
                                          {set.id && prDetails.setPRDetails[set.id]?.isPR && (
                                            <Tooltip
                                              title={
                                                <Box sx={{ p: 0.5 }}>
                                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.75rem' }}>
                                                    Personal Record Set!
                                                  </Typography>
                                                  {prDetails.setPRDetails[set.id].isMaxWeightPR && (
                                                    <Typography variant="caption" display="block">
                                                      • Max Weight: {prDetails.setPRDetails[set.id].prevMaxWeight} → {set.weight} lbs
                                                    </Typography>
                                                  )}
                                                  {prDetails.setPRDetails[set.id].isE1RMPR && (
                                                    <Typography variant="caption" display="block">
                                                      • E1RM: {prDetails.setPRDetails[set.id].prevMax1RM} → {calculateOneRepMax(set.weight, set.reps)} lbs
                                                    </Typography>
                                                  )}
                                                </Box>
                                              }
                                              arrow
                                            >
                                              <WorkspacePremiumIcon sx={{ color: '#FFD700', fontSize: '1.25rem' }} />
                                            </Tooltip>
                                          )}
                                        </Box>
                                      </Box>
                                      <IconButton onClick={() => removeSet(exerciseIndex, setIndex)} color="error" size="small">
                                        <DeleteIcon />
                                      </IconButton>
                                    </Stack>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </Box>
                          )}
                        </Droppable>
                      </CardContent>
                      <CardActions>
                        <Button onClick={() => addSet(exerciseIndex)} size="small" startIcon={<AddIcon />}>Add Set</Button>
                        <Button
                          onClick={() => handleShowHistory(exercise.name)}
                          size="small"
                          disabled={!allWorkouts}
                          startIcon={<HistoryIcon />}
                        >
                          History
                        </Button>
                        {e1rmSuggestions[exercise.name] && (
                          <Button
                            onClick={() => handleAddPRSet(exerciseIndex)}
                            size="small"
                            variant="outlined"
                            disabled={isE1RMLoading}
                          >
                            Add PR Set
                          </Button>
                        )}
                      </CardActions>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      <Box sx={{ mt: 3 }}>
        <Button onClick={addExercise} variant="outlined">Add Exercise</Button>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        {id && (
          <>
            <Button variant="outlined" color="error" onClick={handleDeleteWorkout} disabled={isSaving} startIcon={<DeleteIcon />}>
              Delete
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleCreateTemplateClick} disabled={isSaving} startIcon={<ContentCopyIcon />}>
              Create Template
            </Button>
          </>
        )}
        <Button variant="contained" color="primary" onClick={handleSaveWorkout} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save'}
        </Button>
      </Box>

      {unknownExercises.length > 0 && (
        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="body2" fontWeight="bold">
            Unknown exercises detected:
          </Typography>
          <Typography variant="body2">
            {unknownExercises.join(', ')}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            These exercises are not in your exercise list. You might want to rename them to match an existing exercise or add them as custom exercises to ensure progress is tracked correctly.
          </Typography>
        </Alert>
      )}

      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <ExerciseHistoryDialog
        open={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        exerciseHistory={exerciseHistory}
        exerciseName={historyExerciseName}
      />
      <Dialog
        open={isTemplateDialogOpen}
        onClose={() => !isSavingTemplate && setIsTemplateDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Template from Workout</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={templateDraft?.name || ''}
            onChange={(e) =>
              setTemplateDraft((prev) => (prev ? { ...prev, name: e.target.value } : null))
            }
            onFocus={(e) => e.target.select()}
            sx={{ mb: 3, mt: 1 }}
          />
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Exercises & Calculated 1RM Percentages
          </Typography>
          <Stack spacing={2}>
            {templateDraft?.exercises.map((exercise, idx) => (
              <Box key={exercise.id || idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {exercise.name}
                </Typography>
                <Stack spacing={0.5}>
                  {exercise.sets.map((set, setIdx) => (
                    <Typography key={set.id || setIdx} variant="body2" color="text.secondary">
                      Set {setIdx + 1}: {set.reps} reps @ {set.weight}% 1RM
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTemplateDialogOpen(false)} disabled={isSavingTemplate}>
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={isSavingTemplate}>
            {isSavingTemplate ? <CircularProgress size={24} /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkoutPage;
