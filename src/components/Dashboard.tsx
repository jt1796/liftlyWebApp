import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser, generateFacts } from '../utils';
import { Typography, Box, CircularProgress, Fade, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WorkoutHeatmap from './WorkoutHeatmap';

const CURRENT_WORKOUT_KEY = 'liftly-currentWorkout';

const hasInProgressWorkout = (): boolean => {
  try {
    const stored = localStorage.getItem(CURRENT_WORKOUT_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed.exercises) && parsed.exercises.length > 0;
  } catch {
    return false;
  }
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [factIndex, setFactIndex] = useState(0);
  const [workoutInProgress, setWorkoutInProgress] = useState(hasInProgressWorkout);

  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const facts = useMemo(() => {
    if (workouts) {
      return generateFacts(workouts);
    }
    return [];
  }, [workouts]);

  // Re-check local storage when the tab regains focus or storage changes
  const recheckWorkout = useCallback(() => {
    setWorkoutInProgress(hasInProgressWorkout());
  }, []);

  useEffect(() => {
    window.addEventListener('storage', recheckWorkout);
    window.addEventListener('focus', recheckWorkout);
    return () => {
      window.removeEventListener('storage', recheckWorkout);
      window.removeEventListener('focus', recheckWorkout);
    };
  }, [recheckWorkout]);

  useEffect(() => {
    if (facts.length > 0) {
      const interval = setInterval(() => {
        setFactIndex((prevIndex) => (prevIndex + 1) % facts.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [facts]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ ml: { xs: 2, md: 5 }, mr: { xs: 2, md: 5 }, mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
        Welcome back, {currentUser?.displayName?.split(' ')[0] || currentUser?.email?.split('@')[0]}
      </Typography>

      <WorkoutHeatmap workouts={workouts || []} />

      <Box sx={{ height: '6em', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Fade in={true} key={factIndex}>
          <Typography variant="h6" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            "{facts[factIndex]}"
          </Typography>
        </Fade>
      </Box>

      <Button
        id="start-resume-workout-button"
        variant="contained"
        size="large"
        startIcon={workoutInProgress ? <PlayArrowIcon /> : <AddIcon />}
        onClick={() => navigate('/workout')}
        sx={{ mt: 2, px: 4, py: 1.5, fontSize: '1.1rem' }}
      >
        {workoutInProgress ? 'Resume Workout' : 'Start Workout'}
      </Button>
    </Box>
  );
};

export default Dashboard;
