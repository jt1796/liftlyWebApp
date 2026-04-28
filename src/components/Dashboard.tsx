import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/auth-context-utils';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser, generateFacts } from '../utils';
import { Typography, Box, CircularProgress, Fade } from '@mui/material';
import WorkoutHeatmap from './WorkoutHeatmap';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [factIndex, setFactIndex] = useState(0);

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
    </Box>
  );
};

export default Dashboard;
