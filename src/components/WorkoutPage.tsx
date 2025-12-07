import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Workout, Exercise, Set } from '../types';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  getWorkoutById,
  calculateOneRepMax,
  findSetToPR,
  getE1RmSuggestions,
  getCustomExercises,
  getWorkoutsForUser,
  createFilterOptions,
} from '../utils';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/auth-context-utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomExercise } from '../types';

const localStorageKey = 'liftly-currentWorkout';

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

  useEffect(() => {
    if (id) {
      if (fetchedWorkout) {
        setWorkout(fetchedWorkout);
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
          setWorkout(parsedWorkout as Workout);
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

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  const handleCopyWorkout = () => {
    if (!workout) return;

    const workoutText = `Workout on ${dayjs(workout.date).format('MMMM D, YYYY')}

${workout.exercises
  .map(
    (exercise) =>
      `${exercise.name}
${exercise.sets.map((set) => `  - ${set.weight} x ${set.reps}`).join('\n')}`
  )
  .join('\n\n')}
`;

    navigator.clipboard.writeText(workoutText).then(
      () => {
        setSnackbarMessage('Workout copied to clipboard!');
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
  };

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
      name: combinedExercises[0],
      sets: [],
    };
    setWorkout({ ...workout, exercises: [...workout.exercises, newExercise] });
  };

  const addSet = (exerciseIndex: number) => {
    if (!workout) return;
    const newExercises = [...workout.exercises];
    const newSet: Set = { weight: 0, reps: 0 };

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

  const handleFeelingLucky = (exerciseIndex: number) => {
    if (!workout) return;
    const exerciseName = workout.exercises[exerciseIndex].name;
    const targetE1RM = e1rmSuggestions[exerciseName];

    if (targetE1RM) {
      const suggestedSet = findSetToPR(targetE1RM);
      if (suggestedSet) {
        const newExercises = [...workout.exercises];
        newExercises[exerciseIndex].sets.push(suggestedSet);
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
        <Typography variant="h4" component="h1" gutterBottom>
          {id ? 'Edit Workout' : 'Create Workout'}
        </Typography>
        <IconButton onClick={handleCopyWorkout} color="primary">
          <ContentCopyIcon />
        </IconButton>
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

      {workout.exercises.map((exercise, exerciseIndex) => (
        <Card key={exerciseIndex} sx={{ mt: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
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

            {exercise.sets.map((set, setIndex) => (
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }} key={setIndex} justifyContent="space-between">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField
                    type="number"
                    label="Weight"
                    value={set.weight}
                    sx={{ maxWidth: '100px' }}
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
                    sx={{ maxWidth: '100px' }}
                    onFocus={e => e.target.select()}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                    error={set.reps === 0}
                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value))}
                  />
                  <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
                    1RM: {calculateOneRepMax(set.weight, set.reps)}
                  </Typography>
                </Box>
                <IconButton onClick={() => removeSet(exerciseIndex, setIndex)} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Stack>
            ))}
          </CardContent>
          <CardActions>
            <Button onClick={() => addSet(exerciseIndex)} size="small">Add Set</Button>
            {exercise.sets.length === 0 && e1rmSuggestions[exercise.name] && (
              <Button
                onClick={() => handleFeelingLucky(exerciseIndex)}
                size="small"
                variant="outlined"
                disabled={isE1RMLoading}
              >
                I'm Feeling Lucky
              </Button>
            )}
          </CardActions>
        </Card>
      ))}

      <Box sx={{ mt: 3 }}>
        <Button onClick={addExercise} variant="outlined">Add Exercise</Button>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        {id && (
          <Button variant="outlined" color="error" onClick={handleDeleteWorkout} disabled={isSaving} startIcon={<DeleteIcon />}>
            Delete Workout
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={handleSaveWorkout} disabled={isSaving}>
          {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save Workout'}
        </Button>
      </Box>
      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default WorkoutPage;
