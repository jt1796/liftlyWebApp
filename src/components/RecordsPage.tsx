import { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  FormControl,
  Box,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser } from '../utils/workoutUtils';
import { useAuth } from '../contexts/auth-context-utils';
import {
  calculateExerciseMetrics,
  type ExerciseDataPoint,
} from '../utils/exerciseUtils';

const RecordsPage = () => {
  const { currentUser } = useAuth();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const {
    data: workouts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const userExercises = useMemo(() => {
    if (!workouts) return [];
    const exerciseSet = new Set<string>();
    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        exerciseSet.add(exercise.name);
      });
    });
    return Array.from(exerciseSet);
  }, [workouts]);

  const exerciseData: ExerciseDataPoint[] = useMemo(() => {
    if (workouts && selectedExercise) {
      return calculateExerciseMetrics(workouts, selectedExercise);
    }
    return [];
  }, [workouts, selectedExercise]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <FormControl fullWidth sx={{ mb: 4 }}>
        <Autocomplete
          disablePortal
          value={selectedExercise}
          options={userExercises}
          onChange={(_, value) => setSelectedExercise(value)}
          renderInput={(params) => <TextField {...params} label="Exercise" />}
        />
      </FormControl>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}

      {selectedExercise && exerciseData.length > 0 && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Volume Over Time
          </Typography>
          <LineChart
            xAxis={[
              {
                data: exerciseData.map((d) => d.date),
                scaleType: 'time',
                valueFormatter: (date) => date.toLocaleDateString(),
              },
            ]}
            series={[
              {
                data: exerciseData.map((d) => d.volume),
                label: 'Volume',
              },
            ]}
            height={300}
          />
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Estimated 1RM Over Time
          </Typography>
          <LineChart
            xAxis={[
              {
                data: exerciseData.map((d) => d.date),
                scaleType: 'time',
                valueFormatter: (date) => date.toLocaleDateString(),
              },
            ]}
            series={[
              {
                data: exerciseData.map((d) => d.estimatedOneRepMax),
                label: 'Estimated 1RM',
              },
            ]}
            height={300}
          />
        </Box>
      )}

      {selectedExercise && !isLoading && exerciseData.length === 0 && (
        <Typography>No data available for this exercise.</Typography>
      )}
    </Container>
  );
};

export default RecordsPage;
