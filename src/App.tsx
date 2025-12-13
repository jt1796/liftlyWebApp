import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useApp } from './contexts/app-context-utils'; // Import useApp
import LoginPage from './components/LoginPage';
import ProtectedLayout from './components/ProtectedLayout';
import NotFoundPage from './components/NotFoundPage';
import WorkoutListPage from './components/WorkoutListPage';
import WorkoutPage from './components/WorkoutPage';
import RecordsPage from './components/RecordsPage';
import ExercisesPage from './components/ExercisesPage';
import TemplatesPage from './components/TemplatesPage';
import ErrorPage from './components/ErrorPage';
import Dashboard from './components/Dashboard';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';

function App() {
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/workout/:id" element={<WorkoutPage />} />
            <Route path="/workouts" element={<WorkoutListPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
