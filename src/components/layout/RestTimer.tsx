import {
  IconButton,
  Typography,
  CircularProgress,
  Popover,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
} from '@mui/material';
import { Timer, PlayArrow, Pause, Settings } from '@mui/icons-material';
import { useRestTimer } from '../../hooks/useRestTimer';
import RestTimerPanel from './RestTimerPanel';

/**
 * Compact rest timer button for the AppBar (mobile).
 *
 * - When the timer is **not running**: tapping the icon **starts** the timer immediately.
 * - When the timer **is running**: tapping the icon/countdown **opens** the full panel popover.
 */
export const AppBarTimerButton = ({
  timer,
  anchorEl,
  onOpen,
  onClose,
}: {
  timer: ReturnType<typeof useRestTimer>;
  anchorEl: HTMLElement | null;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}) => {
  const theme = useTheme();

  const handleTap = (e: React.MouseEvent<HTMLElement>) => {
    if (timer.isRunning) {
      // Running → open menu
      onOpen(e);
    } else {
      // Not running → start timer
      timer.handleStart();
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleTap}
        sx={{
          position: 'relative',
          ml: 'auto',
        }}
        aria-label="rest timer"
      >
        {/* Circular progress ring behind the icon */}
        {timer.isRunning && (
          <CircularProgress
            variant="determinate"
            value={timer.percentRemaining}
            size={36}
            thickness={3}
            sx={{
              color: 'rgba(255,255,255,0.5)',
              position: 'absolute',
            }}
          />
        )}
        <Timer />
      </IconButton>
      {timer.isRunning && (
        <Typography
          variant="caption"
          fontWeight="bold"
          onClick={handleTap}
          sx={{
            fontFamily: 'monospace',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '0.8rem',
            ml: -0.5,
            minWidth: 36,
            textAlign: 'center',
            animation: timer.remainingTime <= 10 ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 },
            },
          }}
        >
          {timer.formatCompactTime(timer.remainingTime)}
        </Typography>
      )}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: theme.shadows[8],
              mt: 0.5,
            },
          },
        }}
      >
        <RestTimerPanel {...timer} onClose={onClose} />
      </Popover>
    </>
  );
};

/**
 * Rest timer entry for the Sidebar (desktop).
 * Shows the timer icon + label/countdown, with inline Start/Pause and Settings buttons.
 * - Start/Pause button toggles the timer directly without opening the panel.
 * - Settings button opens the full RestTimerPanel popover for presets and configuration.
 */
export const SidebarTimerButton = ({
  timer,
  anchorEl,
  onOpen,
  onClose,
}: {
  timer: ReturnType<typeof useRestTimer>;
  anchorEl: HTMLElement | null;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClose: () => void;
}) => {
  const theme = useTheme();

  return (
    <>
      <ListItem
        disablePadding
        secondaryAction={
          <Box display="flex" alignItems="center" gap={0.25}>
            {/* Start / Pause button */}
            <IconButton
              edge="end"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                timer.handleToggleTimer();
              }}
              sx={{
                color: timer.isRunning ? 'warning.main' : 'success.main',
              }}
              aria-label={timer.isRunning ? 'pause timer' : 'start timer'}
            >
              {timer.isRunning ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
            </IconButton>
            {/* Settings button → opens the full panel popover */}
            <IconButton
              edge="end"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(e);
              }}
              aria-label="timer settings"
            >
              <Settings fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <ListItemButton onClick={() => timer.handleToggleTimer()}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {timer.isRunning && (
                <CircularProgress
                  variant="determinate"
                  value={timer.percentRemaining}
                  size={28}
                  thickness={3}
                  sx={{
                    color: 'primary.main',
                    position: 'absolute',
                  }}
                />
              )}
              <Timer color={timer.isRunning ? 'primary' : 'inherit'} />
            </Box>
          </ListItemIcon>
          <ListItemText
            primary={
              timer.isRunning
                ? timer.formatCompactTime(timer.remainingTime)
                : 'Rest Timer'
            }
            primaryTypographyProps={{
              fontWeight: timer.isRunning ? 'bold' : 'normal',
              fontFamily: timer.isRunning ? 'monospace' : 'inherit',
              color: timer.isRunning ? 'primary.main' : 'text.primary',
              sx: {
                animation: timer.isRunning && timer.remainingTime <= 10 ? 'pulse 1s infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              },
            }}
          />
        </ListItemButton>
      </ListItem>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              overflow: 'hidden',
              boxShadow: theme.shadows[8],
              ml: 1,
            },
          },
        }}
      >
        <RestTimerPanel {...timer} onClose={onClose} />
      </Popover>
    </>
  );
};

/**
 * RestTimer orchestrator component.
 * Owns the timer hook instance and the completion dialog.
 * Renders nothing visible itself — exposes the timer instance for children.
 */
const RestTimerProvider = ({
  children,
}: {
  children: (timer: ReturnType<typeof useRestTimer>) => React.ReactNode;
}) => {
  const timer = useRestTimer();

  return (
    <>
      {children(timer)}

      {/* Completion Dialog Alert */}
      <Dialog
        open={timer.alertOpen}
        onClose={() => { timer.playTick(); timer.setAlertOpen(false); }}
        aria-labelledby="rest-timer-dialog-title"
        aria-describedby="rest-timer-dialog-description"
        sx={{ zIndex: 2000 }}
      >
        <DialogTitle id="rest-timer-dialog-title" sx={{ fontWeight: 'bold' }}>
          ⏱️ Rest Period Complete!
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => { timer.playTick(); timer.setAlertOpen(false); }} color="primary" variant="contained" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RestTimerProvider;
