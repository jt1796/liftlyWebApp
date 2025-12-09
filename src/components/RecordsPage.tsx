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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context-utils';
import {
  getWorkoutsForUser,
  calculateExerciseMetrics,
  calculateAllPRs,
  getLatestExercisePRs,
  type LatestExercisePRs,
  type ExerciseDataPoint,
  type PR,
  createFilterOptions,
} from '../utils';

type RecentPRsArray = PR[];

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

  const latestExercisePRs: LatestExercisePRs = useMemo(() => {
    if (workouts && selectedExercise) {
      return getLatestExercisePRs(workouts, selectedExercise);
    }
    return {};
  }, [workouts, selectedExercise]);

  const recentPRs: RecentPRsArray = useMemo(() => {
    if (!workouts) return [];
    const prs = calculateAllPRs(workouts).filter(pr => pr.oldValue !== null);
    return prs.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [workouts]);

  const filterExerciseOptions = useMemo(() => createFilterOptions(userExercises), [userExercises]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Exercise Metrics
      </Typography>
      <FormControl fullWidth sx={{ mb: 4 }}>
        <Autocomplete
          disablePortal
          value={selectedExercise}
          options={userExercises}
          onChange={(_, value) => setSelectedExercise(value)}
          filterOptions={filterExerciseOptions}
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

          {(latestExercisePRs.e1rm || latestExercisePRs.maxWeight) && (
            <Box sx={{ mt: 4 }}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {latestExercisePRs.e1rm && (
                      <TableRow>
                        <TableCell>Estimated 1RM</TableCell>
                        <TableCell>{latestExercisePRs.e1rm.value.toFixed(2)}</TableCell>
                        <TableCell>{latestExercisePRs.e1rm.date.toLocaleDateString()}</TableCell>
                      </TableRow>
                    )}
                    {latestExercisePRs.maxWeight && (
                      <TableRow>
                        <TableCell>Most Weight Lifted</TableCell>
                        <TableCell>{latestExercisePRs.maxWeight.value}</TableCell>
                        <TableCell>{latestExercisePRs.maxWeight.date.toLocaleDateString()}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {selectedExercise && !isLoading && exerciseData.length === 0 && (
        <Typography>No data available for this exercise.</Typography>
      )}

      {!selectedExercise && !!recentPRs.length && (
        <Box>
          <Typography variant="h5" gutterBottom>
            Recent Personal Records
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Exercise</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>PR</TableCell>
                  <TableCell>Old PR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPRs.map((pr, index) => (
                  <TableRow key={index}>
                    <TableCell>{pr.exerciseName}</TableCell>
                    <TableCell>{pr.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {pr.value} ({pr.type})
                    </TableCell>
                    <TableCell>
                      {pr.oldValue ? `${pr.oldValue}` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Container>
  );
};

export default RecordsPage;
