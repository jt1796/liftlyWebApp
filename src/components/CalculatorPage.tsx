import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Autocomplete,
  InputAdornment,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Calculate,
  Percent,
  Info,
  FitnessCenter,
  Star,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/auth-context-utils';
import { useApp } from '../contexts/app-context-utils';
import {
  getWorkoutsForUser,
  calculateOneRepMax,
  getLatestExercisePRs,
} from '../utils';

const CalculatorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { darkMode } = useApp();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeTab, setActiveTab] = useState(0);

  // Fetch workouts to populate preset exercise dropdown
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['workouts', currentUser?.uid],
    queryFn: () => getWorkoutsForUser(currentUser!.uid),
    enabled: !!currentUser,
  });

  // Extract unique exercise names from workouts
  const userExercises = useMemo(() => {
    if (!workouts) return [];
    const exerciseSet = new Set<string>();
    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        exerciseSet.add(exercise.name);
      });
    });
    return Array.from(exerciseSet).sort();
  }, [workouts]);

  // E1RM Breaker State
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [targetE1RM, setTargetE1RM] = useState<string>('150');
  const [minReps, setMinReps] = useState<string>('3');
  const [maxReps, setMaxReps] = useState<string>('20');
  const [weightStep, setWeightStep] = useState<string>('5');
  const [startingWeight, setStartingWeight] = useState<string>('45');
  const [sortBy, setSortBy] = useState<'reps' | 'difference'>('reps');

  // 1RM Percentages State
  const [calcWeight, setCalcWeight] = useState<string>('135');
  const [calcReps, setCalcReps] = useState<string>('5');
  const [calcStep, setCalcStep] = useState<string>('5');

  // Handle preset exercise selection for E1RM Breaker
  const handleExerciseChange = (_event: React.SyntheticEvent, newValue: string | null) => {
    setSelectedExercise(newValue);
    if (newValue && workouts) {
      const latestPRs = getLatestExercisePRs(workouts, newValue);
      if (latestPRs.e1rm) {
        setTargetE1RM(latestPRs.e1rm.value.toString());
      }
    }
  };

  // E1RM Breaker calculations
  const breakerSets = useMemo(() => {
    const target = parseFloat(targetE1RM);
    const minR = parseInt(minReps);
    const maxR = parseInt(maxReps);
    const stepVal = parseFloat(weightStep);
    const startW = parseFloat(startingWeight);

    if (
      isNaN(target) ||
      isNaN(minR) ||
      isNaN(maxR) ||
      isNaN(stepVal) ||
      isNaN(startW) ||
      target <= 0 ||
      minR <= 0 ||
      maxR < minR ||
      stepVal <= 0 ||
      startW < 0
    ) {
      return [];
    }

    const results = [];
    // To protect against large loops
    const safeMaxR = Math.min(maxR, 50);
    const safeMinR = Math.min(minR, 50);

    for (let r = safeMinR; r <= safeMaxR; r++) {
      let weight = startW;
      let e1rm = calculateOneRepMax(weight, r);
      // Increment weight until it beats target
      while (e1rm <= target) {
        weight += stepVal;
        e1rm = calculateOneRepMax(weight, r);
        // Safety bounds
        if (weight > target * 2 + 500) break;
      }
      const difference = e1rm - target;
      results.push({
        reps: r,
        weight,
        e1rm,
        difference,
      });
    }
    return results;
  }, [targetE1RM, minReps, maxReps, weightStep, startingWeight]);

  // Find the sets that break E1RM by the absolute smallest amount possible
  const bestSets = useMemo(() => {
    if (breakerSets.length === 0) return [];
    const minDiff = Math.min(...breakerSets.map((s) => s.difference));
    return breakerSets.filter((s) => s.difference === minDiff);
  }, [breakerSets]);

  // Sorted sets based on user preference
  const sortedBreakerSets = useMemo(() => {
    const copy = [...breakerSets];
    if (sortBy === 'reps') {
      return copy.sort((a, b) => a.reps - b.reps);
    } else {
      return copy.sort((a, b) => a.difference - b.difference || a.reps - b.reps);
    }
  }, [breakerSets, sortBy]);

  // 1RM Percentage calculations
  const percentageTable = useMemo(() => {
    const weight = parseFloat(calcWeight);
    const reps = parseInt(calcReps);
    const stepVal = parseFloat(calcStep);

    if (isNaN(weight) || isNaN(reps) || isNaN(stepVal) || weight <= 0 || reps <= 0 || stepVal <= 0) {
      return null;
    }

    const calculated1RM = calculateOneRepMax(weight, reps);
    const percentages = [1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50];

    const rows = percentages.map((percent) => {
      const targetWeight = Math.round((calculated1RM * percent) / stepVal) * stepVal;
      // Estimate reps using reverse Epley: reps = 30 * (1/pct - 1)
      let estReps = 1;
      if (percent < 1.0) {
        estReps = Math.round(30 * (1 / percent - 1));
      }
      return {
        percent: Math.round(percent * 100),
        weight: targetWeight,
        reps: estReps,
      };
    });

    return {
      oneRepMax: calculated1RM,
      rows,
    };
  }, [calcWeight, calcReps, calcStep]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Calculators
      </Typography>

      {/* Tabs Selector */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="calculator-tabs"
          textColor="primary"
          indicatorColor="primary"
          variant={isMobile ? 'fullWidth' : 'standard'}
        >
          <Tab
            icon={<Calculate fontSize="small" />}
            iconPosition="start"
            label="E1RM Breaker"
          />
          <Tab
            icon={<Percent fontSize="small" />}
            iconPosition="start"
            label="1RM & Percentages"
          />
        </Tabs>
      </Box>

      {/* Tab 1: E1RM Breaker */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Inputs Card */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FitnessCenter color="primary" /> E1RM Breaker Parameters
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Find the lightest sets that will register a new estimated 1-Rep Max (E1RM) that beats your target.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* History Preset Dropdown */}
                  {!isLoading && userExercises.length > 0 && (
                    <Autocomplete
                      options={userExercises}
                      value={selectedExercise}
                      onChange={handleExerciseChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Preset from Workout History"
                          placeholder="Select an exercise to load its E1RM"
                          helperText={
                            selectedExercise
                              ? `Loaded current E1RM for ${selectedExercise}`
                              : 'Select an exercise to auto-populate target E1RM'
                          }
                          size="small"
                        />
                      )}
                    />
                  )}

                  {/* Target E1RM */}
                  <TextField
                    label="Target E1RM"
                    type="number"
                    value={targetE1RM}
                    onChange={(e) => setTargetE1RM(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">lbs/kg</InputAdornment>,
                    }}
                    size="small"
                    required
                    error={parseFloat(targetE1RM) <= 0 || isNaN(parseFloat(targetE1RM))}
                    helperText={
                      parseFloat(targetE1RM) <= 0 || isNaN(parseFloat(targetE1RM))
                        ? 'Target E1RM must be greater than 0'
                        : ''
                    }
                  />

                  {/* Reps Bounds Grid */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Min Reps"
                        type="number"
                        value={minReps}
                        onChange={(e) => setMinReps(e.target.value)}
                        size="small"
                        fullWidth
                        error={parseInt(minReps) <= 0 || isNaN(parseInt(minReps))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Max Reps"
                        type="number"
                        value={maxReps}
                        onChange={(e) => setMaxReps(e.target.value)}
                        size="small"
                        fullWidth
                        error={
                          parseInt(maxReps) < parseInt(minReps) ||
                          isNaN(parseInt(maxReps))
                        }
                      />
                    </Grid>
                  </Grid>

                  {/* Step and Starting Weight */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Weight Step"
                        type="number"
                        value={weightStep}
                        onChange={(e) => setWeightStep(e.target.value)}
                        size="small"
                        fullWidth
                        error={parseFloat(weightStep) <= 0 || isNaN(parseFloat(weightStep))}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Starting Weight"
                        type="number"
                        value={startingWeight}
                        onChange={(e) => setStartingWeight(e.target.value)}
                        size="small"
                        fullWidth
                        error={parseFloat(startingWeight) < 0 || isNaN(parseFloat(startingWeight))}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Results Side */}
          <Grid size={{ xs: 12, md: 7 }}>
            {breakerSets.length === 0 ? (
              <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                Please enter valid parameters on the left to calculate sets.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Best Sets Highlight Card */}
                {bestSets.length > 0 && (
                  <Card
                    sx={{
                      background: darkMode === 'dark'
                        ? 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)'
                        : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                      border: '1px solid',
                      borderColor: darkMode === 'dark' ? 'primary.dark' : 'primary.light',
                      boxShadow: 2,
                    }}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Star sx={{ color: 'warning.main' }} />
                        <Typography variant="subtitle1" fontWeight="bold">
                          Optimal Set to Break E1RM (Least Effort Increase)
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        These sets break your target E1RM of <strong>{targetE1RM}</strong> by the smallest amount possible:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {bestSets.map((s, idx) => (
                          <Chip
                            key={idx}
                            label={`${s.weight} × ${s.reps} reps (E1RM: ${s.e1rm} | +${s.difference.toFixed(1)})`}
                            color="primary"
                            variant="filled"
                            sx={{ fontWeight: 'bold', fontSize: '1rem', py: 2 }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Table of all calculated sets */}
                <Card sx={{ boxShadow: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                      <Typography variant="h6">
                        Calculated Sets by Rep Count
                      </Typography>

                      {/* Sort toggler */}
                      <Box display="flex" gap={1} sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
                        <Button
                          size="small"
                          variant={sortBy === 'reps' ? 'contained' : 'outlined'}
                          onClick={() => setSortBy('reps')}
                          sx={{ flexGrow: { xs: 1, sm: 0 } }}
                        >
                          Sort by Reps
                        </Button>
                        <Button
                          size="small"
                          variant={sortBy === 'difference' ? 'contained' : 'outlined'}
                          onClick={() => setSortBy('difference')}
                          sx={{ flexGrow: { xs: 1, sm: 0 } }}
                        >
                          Sort by Increase
                        </Button>
                      </Box>
                    </Box>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>Reps</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>{isMobile ? 'Weight' : 'Required Weight'}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>{isMobile ? 'E1RM' : 'Resulting E1RM'}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>{isMobile ? 'Diff' : 'Increase'}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {sortedBreakerSets.map((s, idx) => {
                            const isBest = bestSets.some(
                              (bs) => bs.reps === s.reps && bs.weight === s.weight
                            );
                            return (
                              <TableRow
                                key={idx}
                                sx={{
                                  backgroundColor: isBest
                                    ? darkMode === 'dark'
                                      ? 'rgba(30, 58, 138, 0.3)'
                                      : 'rgba(224, 231, 255, 0.5)'
                                    : 'inherit',
                                  transition: 'background-color 0.2s',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                  },
                                }}
                              >
                                <TableCell sx={{ fontWeight: isBest ? 'bold' : 'normal', px: { xs: 1, sm: 2 } }}>
                                  {s.reps}
                                </TableCell>
                                <TableCell sx={{ fontWeight: isBest ? 'bold' : 'normal', px: { xs: 1, sm: 2 } }}>
                                  {s.weight}
                                </TableCell>
                                <TableCell sx={{ fontWeight: isBest ? 'bold' : 'normal', px: { xs: 1, sm: 2 } }}>
                                  {s.e1rm}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    color: isBest ? 'primary.main' : 'text.secondary',
                                    fontWeight: isBest ? 'bold' : 'normal',
                                    px: { xs: 1, sm: 2 }
                                  }}
                                >
                                  +{s.difference.toFixed(1)}
                                </TableCell>
                                <TableCell sx={{ px: { xs: 1, sm: 2 } }}>
                                  {isBest ? (
                                    <Chip
                                      label="Optimal"
                                      size="small"
                                      color="success"
                                      icon={<Star fontSize="small" />}
                                      sx={{ height: 20, fontSize: '0.75rem', fontWeight: 'bold' }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      Valid
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box display="flex" gap={1} alignItems="center" sx={{ mt: 2 }}>
                      <Info fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        Calculations are based on the standard Epley E1RM formula: E1RM = Weight × (1 + Reps/30).
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* Tab 2: 1RM & Percentages */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {/* Inputs Card */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%', boxShadow: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Percent color="primary" /> 1RM Estimator Parameters
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Enter your performance for a specific set to estimate your 1-Rep Max and generate training percentage brackets.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {/* Weight */}
                  <TextField
                    label="Performed Weight"
                    type="number"
                    value={calcWeight}
                    onChange={(e) => setCalcWeight(e.target.value)}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">lbs/kg</InputAdornment>,
                    }}
                    size="small"
                    required
                    error={parseFloat(calcWeight) <= 0 || isNaN(parseFloat(calcWeight))}
                  />

                  {/* Reps */}
                  <TextField
                    label="Performed Reps"
                    type="number"
                    value={calcReps}
                    onChange={(e) => setCalcReps(e.target.value)}
                    size="small"
                    required
                    error={parseInt(calcReps) <= 0 || isNaN(parseInt(calcReps))}
                  />

                  {/* Rounding Step */}
                  <TextField
                    label="Rounding Step"
                    type="number"
                    value={calcStep}
                    onChange={(e) => setCalcStep(e.target.value)}
                    size="small"
                    helperText="Rounds percentage weights to this increment"
                    error={parseFloat(calcStep) <= 0 || isNaN(parseFloat(calcStep))}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Results Side */}
          <Grid size={{ xs: 12, md: 7 }}>
            {!percentageTable ? (
              <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                Please enter valid parameters on the left to estimate 1RM.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 1RM Highlight Card */}
                <Card
                  sx={{
                    background: darkMode === 'dark'
                      ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
                      : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    boxShadow: 2,
                    p: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                      ESTIMATED ONE-REP MAX
                    </Typography>
                    <Typography
                      variant="h2"
                      color="primary.main"
                      sx={{ fontWeight: 'black', mb: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                      {percentageTable.oneRepMax}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Calculated from {calcWeight} × {calcReps} reps
                    </Typography>
                  </CardContent>
                </Card>

                {/* Percentage Table Card */}
                <Card sx={{ boxShadow: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Training Intensity Percentages
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use these standard percentages of your E1RM to map out workouts like 5/3/1 or other strength programs.
                    </Typography>

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ backgroundColor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>Percentage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>Weight</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', px: { xs: 1, sm: 2 } }}>{isMobile ? 'Est. Reps' : 'Estimated Reps Cap'}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {percentageTable.rows.map((row, idx) => (
                            <TableRow key={idx} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                              <TableCell sx={{ fontWeight: row.percent === 100 ? 'bold' : 'normal', px: { xs: 1, sm: 2 } }}>
                                {row.percent}%
                              </TableCell>
                              <TableCell sx={{ fontWeight: row.percent === 100 ? 'bold' : 'normal', px: { xs: 1, sm: 2 } }}>
                                {row.weight}
                              </TableCell>
                              <TableCell color="text.secondary" sx={{ px: { xs: 1, sm: 2 } }}>
                                {row.percent === 100 ? '1 rep' : `~${row.reps} reps`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default CalculatorPage;
