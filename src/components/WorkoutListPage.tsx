import React, { useMemo } from 'react';
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
  Tooltip,
  Box,
} from '@mui/material';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useQuery } from '@tanstack/react-query';
import { getWorkoutsForUser, calculateAllPRs } from '../utils';
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

  const allPRs = useMemo(() => {
    if (!workouts) return [];
    return calculateAllPRs(workouts).filter((pr) => pr.oldValue !== null);
  }, [workouts]);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
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
              const workoutPRs = allPRs.filter(
                (pr) => pr.date.getTime() === workout.date.getTime()
              );
              const prCount = workoutPRs.length;

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
                      sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <ListItemText
                        primary={workout.exercises
                          .map((e) => e.name)
                          .join(', ')}
                        secondary={workout.date.toLocaleDateString()}
                      />
                      {prCount > 0 && (
                        <Tooltip
                          title={
                            <Box sx={{ p: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.75rem' }}>
                                Personal Records Broken:
                              </Typography>
                              {workoutPRs.map((pr, index) => (
                                <Typography key={index} variant="caption" display="block">
                                  • {pr.exerciseName} ({pr.type === 'E1RM' ? 'E1RM' : 'Max Weight'}): {pr.oldValue} → {pr.value} lbs
                                </Typography>
                              ))}
                            </Box>
                          }
                          arrow
                        >
                          <Box sx={{ display: 'inline-flex', gap: 0.25, ml: 2 }}>
                            {Array.from({ length: prCount }).map((_, i) => (
                              <WorkspacePremiumIcon key={i} sx={{ color: '#FFD700' }} />
                            ))}
                          </Box>
                        </Tooltip>
                      )}
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
