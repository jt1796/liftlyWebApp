import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { Workout, Exercise } from '../types';
import dayjs from 'dayjs';
import { calculateOneRepMax } from '../utils/localUtils';

interface ExerciseHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  exerciseHistory: (Workout & { exercise: Exercise })[];
  exerciseName: string;
}

const ExerciseHistoryDialog: React.FC<ExerciseHistoryDialogProps> = ({
  open,
  onClose,
  exerciseHistory,
  exerciseName,
}) => {
  if (!exerciseHistory || exerciseHistory.length === 0) {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>History for {exerciseName}</DialogTitle>
        <DialogContent>
          <Typography>No history found for this exercise.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>History for {exerciseName}</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Sets</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exerciseHistory.map((workout) => (
                <TableRow key={workout.id}>
                  <TableCell>
                    {dayjs(workout.date).format('YYYY-MM-DD')}
                  </TableCell>
                  <TableCell>
                    {workout.exercise.sets.map((set, index) => {
                      const e1rm = calculateOneRepMax(set.weight, set.reps);
                      return (
                        <div key={index}>
                          {set.weight} x {set.reps} {e1rm > 0 && `(${e1rm})`}
                        </div>
                      );
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExerciseHistoryDialog;
