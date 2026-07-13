import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useApp } from './contexts/app-context-utils';
import LoginPage from './components/LoginPage';
import ProtectedLayout from './components/ProtectedLayout';
import NotFoundPage from './components/NotFoundPage';
import WorkoutListPage from './components/WorkoutListPage';
import WorkoutPage from './components/WorkoutPage';
import RecordsPage from './components/RecordsPage';
import ExercisesPage from './components/ExercisesPage';
import TemplatesPage from './components/TemplatesPage';
import ScriptsPage from './components/ScriptsPage';
import CalculatorPage from './components/CalculatorPage';
import ErrorPage from './components/ErrorPage';
import Dashboard from './components/Dashboard';
import FriendsPage from './components/FriendsPage';
import FriendWorkoutsPage from './components/FriendWorkoutsPage';
import FriendRecordsPage from './components/FriendRecordsPage';
import FriendTemplatesPage from './components/FriendTemplatesPage';
import FriendScriptsPage from './components/FriendScriptsPage';
import {
  createTheme,
  ThemeProvider,
  CssBaseline,
  alpha,
} from '@mui/material';
import { useMemo } from 'react';
import { getThemeById } from './themes';

function App() {
  const { colorTheme } = useApp();

  const theme = useMemo(() => {
    const def = getThemeById(colorTheme);
    return createTheme({
      ...def.themeOptions,
      components: {
        ...def.themeOptions.components,
        MuiCssBaseline: {
          styleOverrides: (themeParam) => {
            const isDark = themeParam.palette.mode === 'dark';
            const stripeColor = alpha(
              themeParam.palette.primary.main,
              isDark ? 0.04 : 0.045,
            );
            return {
              body: {
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 18px,
                  ${stripeColor} 18px,
                  ${stripeColor} 19px
                )`,
              },
            };
          },
        },
      },
    });
  }, [colorTheme]);


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
            <Route path="/scripts" element={<ScriptsPage />} />
            <Route path="/calculators" element={<CalculatorPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:friendUid/workouts" element={<FriendWorkoutsPage />} />
            <Route path="/friends/:friendUid/records" element={<FriendRecordsPage />} />
            <Route path="/friends/:friendUid/templates" element={<FriendTemplatesPage />} />
            <Route path="/friends/:friendUid/scripts" element={<FriendScriptsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
