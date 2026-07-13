import {
  Box,
  Typography,
  IconButton,
  Button,
  Grid,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
} from '@mui/material';
import {
  Timer,
  PlayArrow,
  Pause,
  Replay,
  KeyboardArrowDown,
  VolumeUp,
  VolumeOff,
  Lightbulb,
  LightbulbOutlined,
  Add,
  Notifications,
  NotificationsActive,
} from '@mui/icons-material';
import { useApp } from '../../contexts/app-context-utils';
import type { RestTimerState, RestTimerActions } from '../../hooks/useRestTimer';

interface RestTimerPanelProps extends RestTimerState, RestTimerActions {
  onClose: () => void;
}

const RestTimerPanel = ({
  totalDuration,
  remainingTime,
  isRunning,
  soundEnabled,
  wakeLockEnabled,
  notificationPermission,
  percentRemaining,
  handleStart,
  handlePause,
  handleReset,
  handlePreset,
  handleAdd30s,
  toggleSound,
  toggleWakeLock,
  requestNotificationPermission,
  playTick,
  formatTime,
  onClose,
}: RestTimerPanelProps) => {
  const theme = useTheme();
  const { darkMode } = useApp();

  return (
    <Box
      sx={{
        width: 310,
        p: 2,
        background: darkMode === 'dark' ? 'rgba(30, 30, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center" gap={1}>
          <Timer color="primary" />
          <Typography variant="subtitle1" fontWeight="bold">
            Rest Timer
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => { playTick(); onClose(); }}>
          <KeyboardArrowDown />
        </IconButton>
      </Box>

      {/* Timer Output */}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ my: 1, position: 'relative' }}
      >
        <Typography
          variant="h3"
          fontWeight="800"
          sx={{
            fontFamily: 'monospace',
            letterSpacing: 2,
            color: isRunning ? 'primary.main' : 'text.primary',
          }}
        >
          {formatTime(remainingTime)}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={percentRemaining}
          sx={{
            width: '90%',
            mt: 1,
            borderRadius: 1,
            height: 6,
            backgroundColor: theme.palette.action.disabledBackground,
            '& .MuiLinearProgress-bar': {
              transition: isRunning ? 'none' : 'transform 0.4s linear',
            }
          }}
        />
      </Box>

      {/* Playback Controls */}
      <Box display="flex" justifyContent="center" gap={3} alignItems="center">
        <Tooltip title="Reset">
          <IconButton onClick={handleReset} color="default" size="large">
            <Replay fontSize="medium" />
          </IconButton>
        </Tooltip>

        {isRunning ? (
          <IconButton
            onClick={handlePause}
            color="primary"
            size="large"
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
              width: 56,
              height: 56,
            }}
          >
            <Pause fontSize="large" />
          </IconButton>
        ) : (
          <IconButton
            onClick={handleStart}
            color="primary"
            size="large"
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              width: 56,
              height: 56,
            }}
          >
            <PlayArrow fontSize="large" />
          </IconButton>
        )}

        <Tooltip title="+30 Seconds">
          <IconButton onClick={handleAdd30s} color="primary" size="large">
            <Add fontSize="medium" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Quick Presets */}
      <Box>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="bold">
          Presets (Starts immediately)
        </Typography>
        <Grid container spacing={1}>
          {[60, 90, 120, 180, 300].map((secs) => (
            <Grid size={{ xs: 2.4 }} key={secs}>
              <Button
                fullWidth
                variant={totalDuration === secs ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handlePreset(secs)}
                sx={{
                  py: 0.5,
                  px: 0,
                  minWidth: 0,
                  fontSize: '0.75rem',
                  borderRadius: 2,
                }}
              >
                {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Utility Toggles */}
      <Box display="flex" flexDirection="column" gap={0.5} sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={wakeLockEnabled}
                onChange={toggleWakeLock}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={0.5}>
                {wakeLockEnabled ? <Lightbulb color="warning" fontSize="small" /> : <LightbulbOutlined fontSize="small" />}
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  Keep Awake
                </Typography>
              </Box>
            }
          />

          <IconButton size="small" onClick={toggleSound} color={soundEnabled ? 'primary' : 'default'}>
            {soundEnabled ? <VolumeUp fontSize="small" /> : <VolumeOff fontSize="small" />}
          </IconButton>
        </Box>

        {/* Notification Permission Indicator */}
        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Background Alerts:
          </Typography>
          {notificationPermission === 'granted' ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              <NotificationsActive color="success" sx={{ fontSize: 16 }} />
              <Typography variant="caption" color="success.main" fontWeight="bold">
                Enabled
              </Typography>
            </Box>
          ) : (
            <Button
              size="small"
              variant="text"
              color="primary"
              onClick={requestNotificationPermission}
              startIcon={<Notifications sx={{ fontSize: 14 }} />}
              sx={{ fontSize: '0.7rem', p: 0, minWidth: 0 }}
            >
              Enable
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RestTimerPanel;
