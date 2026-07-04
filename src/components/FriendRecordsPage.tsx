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
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { LineChart } from '@mui/x-charts/LineChart';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
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
import { getUserProfile } from '../utils/database';

type RecentPRsArray = PR[];

const FriendRecordsPage = () => {
  const { friendUid } = useParams<{ friendUid: string }>();
  const navigate = useNavigate();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['friendProfile', friendUid],
    queryFn: () => getUserProfile(friendUid!),
    enabled: !!friendUid,
  });

  const {
    data: workouts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workouts', friendUid],
    queryFn: () => getWorkoutsForUser(friendUid!),
    enabled: !!friendUid,
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
    const prs = calculateAllPRs(workouts).filter((pr) => pr.oldValue !== null);
    return prs.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [workouts]);

  const filterExerciseOptions = useMemo(() => createFilterOptions(userExercises), [userExercises]);

  const friendName = profile?.displayName ?? 'Friend';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/friends')}
        sx={{ mb: 2 }}
        id="back-to-friends-btn"
      >
        Back to Friends
      </Button>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6">{friendName}'s Records</Typography>
        <Typography variant="body2" color="text.secondary">(read-only)</Typography>
      </Paper>

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
            xAxis={[{ data: exerciseData.map((d) => d.date), scaleType: 'time', valueFormatter: (date) => date.toLocaleDateString() }]}
            series={[{ data: exerciseData.map((d) => d.volume), label: 'Volume' }]}
            height={300}
          />
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Estimated 1RM Over Time
          </Typography>
          <LineChart
            xAxis={[{ data: exerciseData.map((d) => d.date), scaleType: 'time', valueFormatter: (date) => date.toLocaleDateString() }]}
            series={[{ data: exerciseData.map((d) => d.estimatedOneRepMax), label: 'Estimated 1RM' }]}
            height={300}
          />
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Max Weight Over Time
          </Typography>
          <LineChart
            xAxis={[{ data: exerciseData.map((d) => d.date), scaleType: 'time', valueFormatter: (date) => date.toLocaleDateString() }]}
            series={[{ data: exerciseData.map((d) => d.maxWeight), label: 'Max Weight' }]}
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
                {recentPRs
                  .filter((pr) => !selectedExercise || pr.exerciseName === selectedExercise)
                  .map((pr, index) => (
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
                      <TableCell>{pr.type}</TableCell>
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

export default FriendRecordsPage;
