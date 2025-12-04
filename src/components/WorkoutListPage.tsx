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
  Divider,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser } from '../utils';
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
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        My Workouts
      </Typography>
      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}
      {workouts && (
        <List>
          {(() => {
            let lastMonth: number | null = null;
            return workouts.map((workout) => {
              const currentMonth = workout.date.getMonth();
              const monthChanged = lastMonth !== currentMonth;
              lastMonth = currentMonth;
              return (
                <React.Fragment key={workout.id}>
                  {monthChanged && (
                    <React.Fragment>
                      <Divider sx={{ my: 1 }} />
                      <Typography
                        variant="caption"
                        sx={{ mt: 1, mb: 0.5, ml: 1, fontSize: '0.75rem' }}
                      >
                        {workout.date.toLocaleString('default', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Typography>
                    </React.Fragment>
                  )}
                  <ListItem disablePadding>
                    <ListItemButton
                      component={Link}
                      to={`/workout/${workout.id}`}
                    >
                      <ListItemText
                        primary={workout.exercises
                          .map((e) => e.name)
                          .join(', ')}
                        secondary={workout.date.toLocaleDateString()}
                      />
                    </ListItemButton>
                  </ListItem>
                </React.Fragment>
              );
            });
          })()}
        </List>
      )}
    </Container>
  );
};

export default WorkoutListPage;
