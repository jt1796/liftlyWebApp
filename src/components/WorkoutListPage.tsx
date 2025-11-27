import React from 'react';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  ListItemButton,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser } from '../utils/workoutUtils';
import { useAuth } from '../contexts/auth-context-utils';
import { Link } from 'react-router-dom';

const WorkoutListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    data: workouts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        My Workouts
      </Typography>
      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}
      {workouts && (
        <List>
          {workouts.map((workout) => (
            <ListItem key={workout.id} disablePadding>
              <ListItemButton component={Link} to={`/workout/${workout.id}`}>
                <ListItemText
                  primary={workout.exercises.map((e) => e.name).join(', ')}
                  secondary={workout.date.toLocaleDateString()}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};

export default WorkoutListPage;
