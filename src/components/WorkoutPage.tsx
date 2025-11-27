import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { calculateOneRepMax } from '../utils/workoutUtils';
import { DateTimePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const localStorageKey = 'liftly-currentWorkout';

const WorkoutPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<Workout | null>(() => {
    // Initialize with a new workout if no ID is provided
    if (!id) {
      try {
        const storedWorkout = localStorage.getItem(localStorageKey);
        if (storedWorkout) {
          const parsedWorkout = JSON.parse(storedWorkout);
          parsedWorkout.date = new Date(parsedWorkout.date);
          return parsedWorkout as Workout;
        }
      } catch (error) {
        console.error('Failed to parse workout from localStorage', error);
      }

      return {
        name: 'New Workout',
        date: new Date(),
        exercises: [],
      };
    }
    return null; // Will be set by useEffect if ID exists
  });

  useEffect(() => {
    if (id) {
      // Simulate an async fetch
      setTimeout(() => {
        setWorkout({
          id,
          date: new Date(),
          exercises: [
            {
              name: 'Squat',
              sets: [
                { weight: 100, reps: 10 },
                { weight: 100, reps: 10 },
              ],
            },
          ],
        });
      }, 500); // Simulate network delay
    }
  }, [id]);

  useEffect(() => {
    if (workout) {
      localStorage.setItem(localStorageKey, JSON.stringify(workout));
    }
  }, [workout]);

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
      name: exerciseList[0],
      sets: [{ weight: 0, reps: 0 }],
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

  if (!workout) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {id ? 'Edit Workout' : 'Create Workout'}
      </Typography>
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
                  disablePortal
                  value={exercise.name}
                  options={exerciseList}
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
                    sx={{ width: '100px' }}
                    onFocus={e => e.target.select()}
                    onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseInt(e.target.value))}
                  />
                  <TextField
                    type="number"
                    label="Reps"
                    value={set.reps}
                    sx={{ width: '100px' }}
                    onFocus={e => e.target.select()}
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
          </CardActions>
        </Card>
      ))}

      <Box sx={{ mt: 3 }}>
        <Button onClick={addExercise} variant="outlined">Add Exercise</Button>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary">Save Workout</Button>
      </Box>
    </Container>
  );
};

export default WorkoutPage;
