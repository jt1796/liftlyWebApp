import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/auth-context-utils';
import { useApp } from './contexts/app-context-utils'; // Import useApp
import LoginPage from './components/LoginPage';
import ProtectedLayout from './components/ProtectedLayout';
import NotFoundPage from './components/NotFoundPage';
import WorkoutListPage from './components/WorkoutListPage';
import WorkoutPage from './components/WorkoutPage';
import RecordsPage from './components/RecordsPage';
import ExercisesPage from './components/ExercisesPage';
import ErrorPage from './components/ErrorPage';
import { Box, Typography  } from '@mui/material';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';

function App() {
  const { currentUser } = useAuth();
  const { darkMode } = useApp(); // Use darkMode from context

  const theme = createTheme({
    palette: {
      mode: darkMode, // Set theme mode dynamically
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route element={<ProtectedLayout />}>
            <Route
              path="/"
              element={
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '80vh', // Adjust as needed to center vertically on the page
                  }}
                >
                  <Typography variant="h5">Welcome, {currentUser?.email}</Typography>
                </Box>
              }
            />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/workout/:id" element={<WorkoutPage />} />
            <Route path="/workouts" element={<WorkoutListPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
