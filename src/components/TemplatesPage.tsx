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
import { useAuth } from '../contexts/auth-context-utils';
import { exercises as exerciseList } from '../data/exercises';
import type { CustomExercise, Exercise, Set, Template } from '../types';
import {
  createFilterOptions,
  getCustomExercises,
  getTemplates,
  saveTemplates,
} from '../utils';

const emptyTemplate: Template = {
  name: '',
  exercises: [],
};

const TemplatesPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [selectedTemplate, setSelectedTemplate] =
    useState<Template>(emptyTemplate);
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(
    null
  );

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['templates', currentUser?.uid],
    queryFn: () => getTemplates(currentUser!.uid),
    enabled: !!currentUser,
  });

  const { data: customExercises = [] } = useQuery({
    queryKey: ['custom-exercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
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
    mutationFn: (updatedTemplates: Template[]) =>
      saveTemplates(currentUser!.uid, updatedTemplates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', currentUser?.uid] });
      setSnackbarMessage('Templates saved successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error saving templates:', error);
      setSnackbarMessage('Error saving templates.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
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

    if (editingTemplateIndex !== null) {
      newTemplates[editingTemplateIndex] = selectedTemplate;
    } else {
      newTemplates.push(selectedTemplate);
    }
    mutation.mutate(newTemplates);
  };

  const handleDeleteTemplate = (index: number) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      const updatedTemplates = templates.filter((_, i) => i !== index);
      mutation.mutate(updatedTemplates);
    }
  };

  const handleStartWorkout = (template: Template) => {
    const workoutFromTemplate = {
      date: new Date(),
      exercises: template.exercises,
    };
    localStorage.setItem('liftly-currentWorkout', JSON.stringify(workoutFromTemplate));
    navigate('/workout');
  }

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
    const newSet: Set = { weight: 0, reps: 0 };
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
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Workout Templates
      </Typography>
      {isLoadingTemplates ? (
        <CircularProgress />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templates.map((template, index) => (
            <Card key={`${template.name}-${index}`} variant="outlined">
              <CardContent>
                <Typography variant="h5" component="div">
                  {template.name}
                </Typography>
                <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={1} sx={{ mt: 1.5 }}>
                  <Typography color="text.secondary">
                    Exercises:
                  </Typography>
                  {template.exercises.map((exercise, exerciseIndex) => (
                    <Chip
                      key={`${exercise.name}-${exerciseIndex}`}
                      label={exercise.name}
                      size="small"
                    />
                  ))}
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleStartWorkout(template)}>
                  Start Workout
                </Button>
                <Button size="small" onClick={() => handleOpenDialog(index)}>
                  Edit
                </Button>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteTemplate(index)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          {editingTemplateIndex !== null ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent>
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
            sx={{mb: 2}}
          />
          {selectedTemplate.exercises.map((exercise, exerciseIndex) => (
            <Card key={exerciseIndex} sx={{ mt: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
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
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }} key={setIndex}>
                    <TextField
                        type="number"
                        label="Weight"
                        value={set.weight}
                        sx={{ maxWidth: '100px' }}
                        InputProps={{ inputProps: { min: 0 } }}
                        onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value))}
                    />
                    <TextField
                        type="number"
                        label="Reps"
                        value={set.reps}
                        sx={{ maxWidth: '100px' }}
                        InputProps={{ inputProps: { min: 0 } }}
                        onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'reps', parseInt(e.target.value))}
                    />
                     <IconButton onClick={() => removeSet(exerciseIndex, setIndex)} color="error" size="small">
                        <DeleteIcon />
                    </IconButton>
                  </Stack>
                ))}
              </CardContent>
              <CardActions>
                <Button onClick={() => addSet(exerciseIndex)} size="small">Add Set</Button>
              </CardActions>
            </Card>
          ))}
           <Box sx={{ mt: 3 }}>
                <Button onClick={addExercise} variant="outlined">Add Exercise</Button>
            </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? <CircularProgress size={24} /> : 'Save'}
          </Button>
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