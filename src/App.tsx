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
      typography: {
        fontFamily: '"Plus Jakarta Sans", "Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.03em' },
        h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.025em' },
        h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
        h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.015em' },
        h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
        ...def.themeOptions?.typography,
      },
      shape: {
        borderRadius: 14,
        ...def.themeOptions?.shape,
      },
      components: {
        ...def.themeOptions?.components,
        MuiCssBaseline: {
          styleOverrides: (themeParam) => {
            const isDark = themeParam.palette.mode === 'dark';
            const stripeColor = alpha(
              themeParam.palette.primary.main,
              isDark ? 0.03 : 0.035,
            );
            return {
              body: {
                backgroundImage: `repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 24px,
                  ${stripeColor} 24px,
                  ${stripeColor} 25px
                )`,
                backgroundAttachment: 'fixed',
              },
            };
          },
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: () => ({
              borderRadius: 10,
              fontWeight: 600,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-1.5px)',
              },
              '&:active': {
                transform: 'translateY(0)',
              },
            }),
            sizeSmall: {
              padding: '4px 10px',
              fontSize: '0.8rem',
            },
            sizeMedium: {
              padding: '8px 20px',
              fontSize: '0.875rem',
            },
            sizeLarge: {
              padding: '12px 28px',
              fontSize: '0.9375rem',
            },
            containedPrimary: ({ theme: t }) => {
              const primaryColor = t.palette.primary.main;
              const secondaryColor = t.palette.secondary?.main || t.palette.primary.dark;
              return {
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                color: t.palette.primary.contrastText || '#ffffff',
                boxShadow: `0 4px 14px 0 ${alpha(primaryColor, 0.35)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${primaryColor} 20%, ${secondaryColor} 120%)`,
                  boxShadow: `0 6px 20px 0 ${alpha(primaryColor, 0.5)}`,
                },
              };
            },
            containedSecondary: ({ theme: t }) => {
              const secondaryColor = t.palette.secondary?.main || t.palette.secondary?.dark || t.palette.primary.main;
              const primaryColor = t.palette.primary.main;
              return {
                background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                color: t.palette.secondary?.contrastText || '#ffffff',
                boxShadow: `0 4px 14px 0 ${alpha(secondaryColor, 0.35)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${secondaryColor} 20%, ${primaryColor} 120%)`,
                  boxShadow: `0 6px 20px 0 ${alpha(secondaryColor, 0.5)}`,
                },
              };
            },
            outlined: ({ theme: t }) => ({
              borderWidth: '1.5px',
              '&:hover': {
                borderWidth: '1.5px',
                backgroundColor: alpha(t.palette.primary.main, 0.05),
              },
            }),
          },
        },
        MuiCard: {
          styleOverrides: {
            root: ({ theme: t }) => {
              const isDark = t.palette.mode === 'dark';
              return {
                borderRadius: 16,
                backgroundImage: 'none',
                boxShadow: isDark
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
                  : '0 8px 24px 0 rgba(148, 163, 184, 0.1)',
                border: `1px solid ${
                  isDark ? alpha(t.palette.divider, 0.08) : alpha(t.palette.divider, 0.05)
                }`,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: isDark
                    ? '0 12px 40px 0 rgba(0, 0, 0, 0.4)'
                    : '0 12px 30px 0 rgba(148, 163, 184, 0.18)',
                },
              };
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: ({ theme: t }) => {
              const isDark = t.palette.mode === 'dark';
              return {
                borderRadius: 16,
                backgroundImage: 'none',
                boxShadow: isDark
                  ? '0 8px 32px 0 rgba(0, 0, 0, 0.25)'
                  : '0 8px 24px 0 rgba(148, 163, 184, 0.06)',
                border: `1px solid ${
                  isDark ? alpha(t.palette.divider, 0.06) : alpha(t.palette.divider, 0.03)
                }`,
              };
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: ({ theme: t }) => {
              const isDark = t.palette.mode === 'dark';
              return {
                background: isDark
                  ? alpha(t.palette.background.paper, 0.75)
                  : alpha(t.palette.background.paper, 0.8),
                backdropFilter: 'blur(16px)',
                borderBottom: `1px solid ${
                  isDark ? alpha(t.palette.divider, 0.08) : alpha(t.palette.divider, 0.05)
                }`,
                boxShadow: 'none',
                color: t.palette.text.primary,
              };
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: ({ theme: t }) => {
              const isDark = t.palette.mode === 'dark';
              return {
                borderRight: `1px solid ${
                  isDark ? alpha(t.palette.divider, 0.08) : alpha(t.palette.divider, 0.05)
                }`,
                background: t.palette.background.paper,
              };
            },
          },
        },
        MuiListItemButton: {
          styleOverrides: {
            root: ({ theme: t }) => ({
              borderRadius: 10,
              margin: '3px 10px',
              transition: 'all 0.15s ease-in-out',
              '&.Mui-selected': {
                backgroundColor: alpha(t.palette.primary.main, 0.12),
                color: t.palette.primary.main,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: alpha(t.palette.primary.main, 0.18),
                },
                '& .MuiListItemIcon-root': {
                  color: t.palette.primary.main,
                },
              },
              '&:hover': {
                backgroundColor: alpha(t.palette.text.primary, 0.05),
              },
            }),
          },
        },
        MuiOutlinedInput: {
          styleOverrides: {
            root: ({ theme: t }) => ({
              borderRadius: 10,
              transition: 'all 0.15s ease-in-out',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha(t.palette.primary.main, 0.4),
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: t.palette.primary.main,
                borderWidth: '1.5px',
                boxShadow: `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}`,
              },
            }),
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
