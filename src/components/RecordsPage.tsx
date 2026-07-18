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
  Chip,
  Link,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context-utils';
import WorkoutHeatmap from './WorkoutHeatmap';
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
  const theme = useTheme();
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

  const filteredWorkouts = useMemo(() => {
    if (!workouts || !selectedExercise) return [];
    return workouts.filter((workout) =>
      workout.exercises.some((exercise) => exercise.name === selectedExercise)
    );
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
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {latestExercisePRs.e1rm && <Chip label={latestExercisePRs.e1rm!.value + ' E1RM'} />}
            {latestExercisePRs.maxWeight && <Chip label={latestExercisePRs.maxWeight!.value + ' Max Weight'} />}
          </Box>
          <WorkoutHeatmap workouts={filteredWorkouts} />

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
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
                color: theme.palette.primary.main,
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
                color: theme.palette.primary.main,
              },
            ]}
            height={300}
          />
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Max Weight Over Time
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
                data: exerciseData.map((d) => d.maxWeight),
                label: 'Max Weight',
                color: theme.palette.primary.main,
              },
            ]}
            height={300}
          />
        </Box>
      )}

      {selectedExercise && !isLoading && exerciseData.length === 0 && (
        <Typography>No data available for this exercise.</Typography>
      )}

      {!!recentPRs.length && (
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
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentPRs.filter(pr => !selectedExercise || (pr.exerciseName === selectedExercise)).map((pr, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => setSelectedExercise(pr.exerciseName)}
                        sx={{ textAlign: 'left', verticalAlign: 'baseline' }}
                      >
                        {pr.exerciseName}
                      </Link>
                    </TableCell>
                    <TableCell>{pr.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {pr.oldValue} {'→'} {pr.value}
                    </TableCell>
                    <TableCell>
                      {pr.type}
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
