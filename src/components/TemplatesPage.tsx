import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/auth-context-utils';
import { exercises as exerciseList } from '../data/exercises';
import type { CustomExercise, Exercise, Set, Template } from '../types';
import {
  createFilterOptions,
  getCustomExercises,
  getLatestExercisePRs,
  getTemplates,
  getWorkoutsForUser,
  saveTemplates,
} from '../utils';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const ensureIds = (templates: Template[]): Template[] => {
  return templates.map((template) => ({
    ...template,
    id: template.id || generateId(),
    exercises: template.exercises.map((ex) => ({
      ...ex,
      id: ex.id || generateId(),
      sets: ex.sets.map((set) => ({
        ...set,
        id: set.id || generateId(),
      })),
    })),
  }));
};

const emptyTemplate: Template = {
  name: '',
  exercises: [],
};

const TemplatesPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRmDialogOpen, setIsRmDialogOpen] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template>(emptyTemplate);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(
    null
  );
  const [rmsToUse, setRmsToUse] = useState<Record<string, number>>({});

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates', currentUser?.uid],
    queryFn: async () => {
      const fetched = await getTemplates(currentUser!.uid);
      return ensureIds(fetched);
    },
    enabled: !!currentUser,
  });

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newTemplates = Array.from(templates);
    const [removed] = newTemplates.splice(source.index, 1);
    newTemplates.splice(destination.index, 0, removed);

    mutation.mutate(newTemplates);
  };

  const { data: customExercises = [] } = useQuery({
    queryKey: ['custom-exercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });

  const { data: allWorkouts = [] } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  const combinedExercises = useMemo(() => {
    return [
      ...exerciseList,
      ...customExercises.map((ex: CustomExercise) => ex.name),
    ];
  }, [customExercises]);

  const filterExerciseOptions = useMemo(() => createFilterOptions(combinedExercises), [combinedExercises]);

  const mutation = useMutation({
    mutationFn: async (updatedTemplates: Template[]) => {
      await saveTemplates(currentUser!.uid, updatedTemplates);
    },
    onMutate: async (updatedTemplates) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['templates', currentUser?.uid] });

      // Snapshot the previous value
      const previousTemplates = queryClient.getQueryData<Template[]>(['templates', currentUser?.uid]);

      // Optimistically update to the new value
      queryClient.setQueryData(['templates', currentUser?.uid], updatedTemplates);

      // Return a context object with the snapshotted value
      return { previousTemplates };
    },
    onError: (error, _updatedTemplates, context) => {
      console.error('Error saving templates:', error);
      if (context?.previousTemplates) {
        queryClient.setQueryData(['templates', currentUser?.uid], context.previousTemplates);
      }
      setSnackbarMessage('Error saving templates.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
    onSuccess: () => {
      setSnackbarMessage('Templates saved successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
      setIsDialogOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', currentUser?.uid] });
    },
  });

  const handleOpenDialog = (index?: number) => {
    if (index !== undefined && templates[index]) {
      // Deep copy to avoid mutating the cached data directly
      setSelectedTemplate(JSON.parse(JSON.stringify(templates[index])));
      setEditingTemplateIndex(index);
    } else {
      setSelectedTemplate(emptyTemplate);
      setEditingTemplateIndex(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplateIndex(null);
  };

  const handleSaveTemplate = () => {
    const newName = selectedTemplate.name.trim();
    if (newName === '') {
      setSnackbarMessage('Template name cannot be empty.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    }

    const newTemplates = [...templates];
    const templateToSave = {
      ...selectedTemplate,
      id: selectedTemplate.id || generateId(),
    };

    if (editingTemplateIndex !== null) {
      newTemplates[editingTemplateIndex] = templateToSave;
    } else {
      newTemplates.push(templateToSave);
    }
    mutation.mutate(newTemplates);
  };

  const handleDeleteTemplate = (index: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter((_, i) => i !== index);
      mutation.mutate(updatedTemplates);
    }
  };

  const handleStartWorkoutClick = (template: Template) => {
    setSelectedTemplate(template);
    const uniqueExercises = Array.from(new Set(template.exercises.map(e => e.name)));
    const initialRms: Record<string, number> = {};
    uniqueExercises.forEach(exName => {
      const latestPRs = getLatestExercisePRs(allWorkouts, exName);
      initialRms[exName] = latestPRs.e1rm?.value || 0;
    });
    setRmsToUse(initialRms);
    setIsRmDialogOpen(true);
  };

  const handleConfirmStartWorkout = () => {
    const workoutFromTemplate = {
      title: selectedTemplate.name,
      date: new Date(),
      exercises: selectedTemplate.exercises.map(exercise => ({
        ...exercise,
        sets: exercise.sets.map(set => ({
          ...set,
          weight: Math.round((set.weight / 100) * (rmsToUse[exercise.name] || 0) / 5) * 5, // Round to nearest 5
        }))
      })),
    };
    localStorage.setItem('liftly-currentWorkout', JSON.stringify(workoutFromTemplate));
    navigate('/workout');
  };

  const handleExerciseChange = (
    index: number,
    field: keyof Exercise,
    value: string
  ) => {
    const newExercises = [...selectedTemplate.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setSelectedTemplate({ ...selectedTemplate, exercises: newExercises });
  };

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof Set,
    value: number
  ) => {
    const newExercises = [...selectedTemplate.exercises];
    const newSets = [...newExercises[exerciseIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
    setSelectedTemplate({ ...selectedTemplate, exercises: newExercises });
  };

  const addExercise = () => {
    const newExercise: Exercise = {
      id: generateId(),
      name: combinedExercises[0],
      sets: [],
    };
    setSelectedTemplate({
      ...selectedTemplate,
      exercises: [...selectedTemplate.exercises, newExercise],
    });
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...selectedTemplate.exercises];
    const newSet: Set = { id: generateId(), weight: 0, reps: 0 };
    const exerciseSets = newExercises[exerciseIndex].sets;
    if (exerciseSets.length > 0) {
      newSet.weight = exerciseSets[exerciseSets.length - 1].weight;
    }
    newExercises[exerciseIndex].sets.push(newSet);
    setSelectedTemplate({ ...selectedTemplate, exercises: newExercises });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...selectedTemplate.exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setSelectedTemplate({ ...selectedTemplate, exercises: newExercises });
  };

  const removeExercise = (exerciseIndex: number) => {
    const newExercises = [...selectedTemplate.exercises];
    newExercises.splice(exerciseIndex, 1);
    setSelectedTemplate({ ...selectedTemplate, exercises: newExercises });
  };

  const handleCloseSnackbar = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  return (
    <Container sx={{ mt: 2, mb: 4 }}>
      {isLoadingTemplates ? (
        <CircularProgress />
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="templates">
            {(provided) => (
              <Box
                {...provided.droppableProps}
                ref={provided.innerRef}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                {templates.map((template, index) => (
                  <Draggable key={template.id} draggableId={template.id!} index={index}>
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        variant="outlined"
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, '&:last-child': { pb: 1 } }}>
                          <Box
                            {...provided.dragHandleProps}
                            sx={{ display: 'flex', alignItems: 'center', cursor: 'grab' }}
                          >
                            <DragIndicatorIcon color="action" />
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                              {template.name}
                            </Typography>
                            <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={0.5} sx={{ mt: 0.25 }}>
                              <Typography variant="caption" color="text.secondary">
                                Ex:
                              </Typography>
                              {template.exercises.map((exercise) => (
                                <Chip
                                  key={exercise.id}
                                  label={exercise.name}
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.75rem' }}
                                />
                              ))}
                            </Stack>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => handleStartWorkoutClick(template)}
                              color="primary"
                              title="Start Workout"
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(index)}
                              title="Edit Template"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteTemplate(index)}
                              color="error"
                              title="Delete Template"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 1.5, sm: 2, md: 3 },
            width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 32px)', md: '100%' },
            maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 32px)', md: 'calc(100% - 64px)' },
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          {editingTemplateIndex !== null ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 } }}>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={selectedTemplate.name}
            onChange={(e) =>
              setSelectedTemplate({ ...selectedTemplate, name: e.target.value })
            }
            onFocus={(e) => e.target.select()}
            sx={{mb: 2}}
          />
          {selectedTemplate.exercises.map((exercise, exerciseIndex) => (
            <Card key={exercise.id || exerciseIndex} sx={{ mt: 2 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center">
                  <FormControl fullWidth>
                    <Autocomplete
                      value={exercise.name}
                      options={combinedExercises}
                      filterOptions={filterExerciseOptions}
                      onChange={(_, value) => handleExerciseChange(exerciseIndex, 'name', value!)}
                      renderInput={(params) => <TextField {...params} label="Exercise" />}
                    />
                  </FormControl>
                  <IconButton onClick={() => removeExercise(exerciseIndex)} color="error" size="small">
                    <DeleteIcon />
                  </IconButton>
                </Stack>
                {exercise.sets.map((set, setIndex) => (
                  <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center" sx={{ mt: 2 }} key={set.id || setIndex}>
                    <TextField
                        type="number"
                        label="1RM %"
                        value={set.weight}
                        sx={{ width: { xs: '85px', sm: '120px' } }}
                        onFocus={(e) => e.target.select()}
                        InputProps={{ inputProps: { min: 0, max: 100 } }}
                        onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value))}
                    />
                    <TextField
                        type="number"
                        label="Reps"
                        value={set.reps}
                        sx={{ width: { xs: '75px', sm: '100px' } }}
                        onFocus={(e) => e.target.select()}
                        InputProps={{ inputProps: { min: 0 } }}
                        onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value))}
                    />
                     <IconButton onClick={() => removeSet(exerciseIndex, setIndex)} color="error" size="small">
                        <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </CardContent>
              <CardActions sx={{ px: { xs: 1.5, sm: 2 }, pb: { xs: 1.5, sm: 2 }, pt: 0 }}>
                <Button onClick={() => addSet(exerciseIndex)} size="small">Add Set</Button>
              </CardActions>
            </Card>
          ))}
           <Box sx={{ mt: 3 }}>
                <Button onClick={addExercise} variant="outlined">Add Exercise</Button>
            </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isRmDialogOpen}
        onClose={() => setIsRmDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 1.5, sm: 2 },
            width: { xs: 'calc(100% - 24px)', sm: 'auto' },
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>Enter 1RMs for Workout</DialogTitle>
        <DialogContent sx={{ px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your current 1 Rep Max for each exercise to calculate the weights for this session.
          </Typography>
          <Stack spacing={2}>
            {Object.keys(rmsToUse).map(exName => (
              <TextField
                key={exName}
                label={`${exName} 1RM`}
                type="number"
                value={rmsToUse[exName]}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRmsToUse({ ...rmsToUse, [exName]: parseFloat(e.target.value) || 0 })}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
          <Button onClick={() => setIsRmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmStartWorkout} variant="contained">Start</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Button
        variant="contained"
        onClick={() => handleOpenDialog()}
        sx={{ mt: 3, mb: 2 }} // Added margin-top to separate from cards
      >
        Create New Template
      </Button>
    </Container>
  );
};

export default TemplatesPage;