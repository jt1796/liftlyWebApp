import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/auth-context-utils';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser, generateFacts } from '../utils';
import { Typography, Box, CircularProgress, Fade } from '@mui/material';

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
    <Box sx={{ml: 5, mr: 5, minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Welcome, {currentUser?.displayName || currentUser?.email}
      </Typography>
      <Fade in={true} key={factIndex}>
        <Typography variant="body1" sx={{ minHeight: '4em' }}>
          {facts[factIndex]}
        </Typography>
      </Fade>
    </Box>
  );
};

export default Dashboard;
