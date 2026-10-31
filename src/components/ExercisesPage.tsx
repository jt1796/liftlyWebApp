import {
  Button,
  Container,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../contexts/auth-context-utils';
import { getCustomExercises, saveCustomExercises } from '../utils';
import type { CustomExercise } from '../types';

const ExercisesPage = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const {
    data: customExercises = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['custom-exercises', currentUser?.uid],
    queryFn: () => getCustomExercises(currentUser!.uid),
    enabled: !!currentUser,
  });

  const mutation = useMutation({
    mutationFn: (exercises: CustomExercise[]) =>
      saveCustomExercises(currentUser!.uid, exercises),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-exercises'] });
      setSnackbarMessage('Exercises updated successfully!');
      setSnackbarSeverity('success');
      setShowSnackbar(true);
    },
    onError: (error) => {
      console.error('Error updating exercises:', error);
      setSnackbarMessage('Error updating exercises.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
    },
  });

  const handleAddExercise = () => {
    if (newExerciseName.trim() === '') {
      setSnackbarMessage('Exercise name cannot be empty.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    };

    if (customExercises.some(ex => ex.name.toLowerCase() === newExerciseName.trim().toLowerCase())) {
      setSnackbarMessage('Exercise with this name already exists.');
      setSnackbarSeverity('error');
      setShowSnackbar(true);
      return;
    }

    const newExercise = { name: newExerciseName.trim() };
    mutation.mutate([...customExercises, newExercise]);
    setNewExerciseName('');
  };

  const handleDeleteExercise = (exerciseName: string) => {
    const updatedExercises = customExercises.filter(
      (ex: CustomExercise) => ex.name !== exerciseName
    );
    mutation.mutate(updatedExercises);
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setShowSnackbar(false);
  };

  return (
    <Container sx={{mt: 4, mb: 4}}>
      <Typography variant="h4" gutterBottom>
        Custom Exercises
      </Typography>
      {isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refetch()}>Retry</Button>} sx={{ mb: 2 }}>
          Could not load your custom exercises. Adding or deleting is disabled to protect your saved list. {error instanceof Error ? error.message : ''}
        </Alert>
      )}
      {isLoading && <Typography color="text.secondary" sx={{ mb: 2 }}>Loading your exercises…</Typography>}
      <TextField
        label="New Exercise Name"
        value={newExerciseName}
        onChange={(e) => setNewExerciseName(e.target.value)}
        variant="outlined"
        size="small"
        disabled={isLoading || isError || !currentUser}
      />
      <Button
        onClick={handleAddExercise}
        variant="contained"
        color="primary"
        style={{ marginLeft: '1rem' }}
        disabled={newExerciseName.trim() === '' || mutation.isPending || isLoading || isError || !currentUser}
      >
        {mutation.isPending ? 'Adding...' : 'Add'}
      </Button>
      <List>
        {customExercises.map((exercise: CustomExercise) => (
          <ListItem
            key={exercise.name}
            secondaryAction={
              <Button
                onClick={() => handleDeleteExercise(exercise.name)}
                color="secondary"
                disabled={mutation.isPending || isLoading || isError}
              >
                Delete
              </Button>
            }
          >
            <ListItemText primary={exercise.name} />
          </ListItem>
        ))}
      </List>
      <Snackbar open={showSnackbar} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ExercisesPage;

