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
import { getWorkoutsForUser, calculateAllPRs, calculateTotalWorkoutWeight, getWorkoutWeightObject } from '../utils';
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
              const totalWeight = calculateTotalWorkoutWeight(workout);
              const weightObj = getWorkoutWeightObject(totalWeight);

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
                        primary={
                          (workout.title ? `${workout.title} - ` : '') +
                          workout.exercises.map((e) => e.name).join(', ')
                        }
                        secondary={workout.date.toLocaleDateString()}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
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
                            <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                              <WorkspacePremiumIcon sx={{ color: '#FFD700' }} />
                              {prCount > 1 && (
                                <Typography
                                  component="sup"
                                  sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: '#FFD700',
                                    ml: 0.25,
                                    alignSelf: 'flex-start',
                                    lineHeight: 1,
                                    mt: -0.25,
                                  }}
                                >
                                  {prCount}
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        )}
                        {totalWeight > 0 && (
                          <Tooltip
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                  Total Weight Lifted:
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                  {totalWeight.toLocaleString()} lbs
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.8 }}>
                                  Equivalent to a {weightObj.name} ({weightObj.weight >= 1 ? `${weightObj.weight.toLocaleString()} lbs` : `${weightObj.weight} lbs`})
                                </Typography>
                              </Box>
                            }
                            arrow
                          >
                            <Typography
                              component="span"
                              sx={{ fontSize: '1.4rem', cursor: 'default', display: 'inline-flex', alignItems: 'center' }}
                            >
                              {weightObj.emoji}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
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
