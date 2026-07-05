import React, { useMemo, useState } from 'react';
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
  Paper,
  Button,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkoutsForUser, calculateAllPRs, calculateTotalWorkoutWeight, getWorkoutWeightObject, calculateOneRepMax } from '../utils';
import { getUserProfile } from '../utils/database';

const FriendWorkoutsPage: React.FC = () => {
  const { friendUid } = useParams<{ friendUid: string }>();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const allPRs = useMemo(() => {
    if (!workouts) return [];
    return calculateAllPRs(workouts).filter((pr) => pr.oldValue !== null);
  }, [workouts]);

  const friendName = profile?.displayName ?? 'Friend';

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/friends')}
        sx={{ mb: 2 }}
        id="back-to-friends-btn"
      >
        Back to Friends
      </Button>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6">{friendName}'s Workouts</Typography>
        <Typography variant="body2" color="text.secondary">(read-only)</Typography>
      </Paper>

      {isLoading && <CircularProgress />}
      {error && <Alert severity="error">{(error as Error).message}</Alert>}

      {workouts && workouts.length === 0 && (
        <Typography color="text.secondary">No workouts recorded yet.</Typography>
      )}

      {workouts && workouts.length > 0 && (
        <List disablePadding>
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
              const workoutId = workout.id ?? workout.date.getTime().toString();
              const isExpanded = expandedId === workoutId;


              return (
                <React.Fragment key={workoutId}>
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
                    <Box sx={{ width: '100%' }}>
                      <ListItemButton
                        onClick={() => handleToggle(workoutId)}
                        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <ListItemText
                          primary={workout.exercises.map((e) => e.name).join(', ')}
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
                          {isExpanded ? (
                            <ExpandLessIcon sx={{ color: 'text.secondary' }} />
                          ) : (
                            <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
                          )}
                        </Box>
                      </ListItemButton>

                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            mx: 1,
                            mb: 1,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            borderLeft: '3px solid',
                            borderColor: 'primary.main',
                          }}
                        >
                          {workout.exercises.map((exercise, ei) => (
                            <Box key={ei} sx={{ mb: ei < workout.exercises.length - 1 ? 1.5 : 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {exercise.name}
                              </Typography>
                              {exercise.sets.map((set, si) => {
                                const e1rm = calculateOneRepMax(set.weight, set.reps);
                                return (
                                  <Box
                                    key={si}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1.5,
                                      ml: 1,
                                      mb: 0.25,
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', minWidth: 100 }}>
                                      {set.weight} lbs × {set.reps}
                                    </Typography>
                                    {e1rm > 0 && set.reps > 0 && (
                                      <Typography variant="caption" color="text.secondary">
                                        E1RM: ~{e1rm} lbs
                                      </Typography>
                                    )}
                                  </Box>
                                );
                              })}
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    </Box>
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

export default FriendWorkoutsPage;
