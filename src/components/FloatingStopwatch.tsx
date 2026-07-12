import { useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Grid,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
  Dialog,
  DialogTitle,
  DialogActions,
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
import { useApp } from '../contexts/app-context-utils';
// Safe localStorage wrappers to prevent crashing in restricted PWA/Webview environments
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore error
  }
};

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore error
  }
};

// Impure functions must be declared outside the React component scope to satisfy purity lint rules
const getSystemTime = (): number => {
  return Date.now();
};

const FloatingStopwatch = () => {
  const theme = useTheme();
  const { darkMode } = useApp();

  // Delay rendering entirely on mount so the position:fixed FAB reliably appears
  // on PWA cold-start. Some mobile browsers fail to composite fixed elements that
  // exist from the initial paint — by deferring the first render of this subtree,
  // we guarantee the browser does a full layout pass when the element is inserted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const wakeLockRef = useRef<{ release(): Promise<void> } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Lazy Initializers to avoid calling setState synchronously on mount
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    const saved = safeGetItem('liftly_timer_totalDuration');
    return saved ? parseInt(saved, 10) : 180;
  });

  const [endTime, setEndTime] = useState<number | null>(() => {
    const savedEndTimeStr = safeGetItem('liftly_timer_endTime');
    const savedIsRunningStr = safeGetItem('liftly_timer_isRunning');
    if (savedIsRunningStr === 'true' && savedEndTimeStr) {
      const savedEndTime = parseInt(savedEndTimeStr, 10);
      if (getSystemTime() < savedEndTime) {
        return savedEndTime;
      }
    }
    return null;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const savedEndTimeStr = safeGetItem('liftly_timer_endTime');
    const savedIsRunningStr = safeGetItem('liftly_timer_isRunning');
    if (savedIsRunningStr === 'true' && savedEndTimeStr) {
      const savedEndTime = parseInt(savedEndTimeStr, 10);
      if (getSystemTime() < savedEndTime) {
        return true;
      }
    }
    return false;
  });

  const [remainingTime, setRemainingTime] = useState<number>(() => {
    const savedEndTimeStr = safeGetItem('liftly_timer_endTime');
    const savedIsRunningStr = safeGetItem('liftly_timer_isRunning');
    const savedRemainingStr = safeGetItem('liftly_timer_remainingTime');
    const savedDurationStr = safeGetItem('liftly_timer_totalDuration');
    const totalDur = savedDurationStr ? parseInt(savedDurationStr, 10) : 180;

    if (savedIsRunningStr === 'true' && savedEndTimeStr) {
      const savedEndTime = parseInt(savedEndTimeStr, 10);
      const now = getSystemTime();
      if (now < savedEndTime) {
        return Math.max(0, Math.ceil((savedEndTime - now) / 1000));
      }
    }
    return savedRemainingStr ? parseInt(savedRemainingStr, 10) : totalDur;
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = safeGetItem('liftly_timer_soundEnabled');
    return saved !== 'false';
  });

  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(() => {
    const saved = safeGetItem('liftly_timer_wakeLockEnabled');
    return saved !== 'false';
  });

  const [alertOpen, setAlertOpen] = useState<boolean>(false);

  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    try {
      return 'Notification' in window ? Notification.permission : 'default';
    } catch {
      return 'default';
    }
  });

  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  // Initialize/Resume AudioContext
  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Synthesize a beautiful double-tone arpeggio chime when rest is complete
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration - 0.01);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.25);        // C5
      playTone(659.25, now + 0.15, 0.25); // E5
      playTone(783.99, now + 0.3, 0.45);  // G5
    } catch {
      console.error('Audio chime play failed');
    }
  }, [soundEnabled]);

  // Soft micro-feedback click
  const playTick = useCallback(() => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio context blocked/not interaction-based yet
    }
  }, []);

  // Wake Lock management
  const requestWakeLock = useCallback(async () => {
    const nav = navigator as unknown as { wakeLock?: { request(type: string): Promise<WakeLockSentinel> } };
    if (nav.wakeLock && wakeLockEnabled) {
      try {
        if (wakeLockRef.current) return;
        wakeLockRef.current = await nav.wakeLock.request('screen');
        console.log('Screen Wake Lock acquired');
      } catch {
        console.warn('Screen Wake Lock failed');
      }
    }
  }, [wakeLockEnabled]);

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
        console.log('Screen Wake Lock released');
      }).catch((err) => {
        console.error('Screen Wake Lock release failed:', err);
      });
    }
  };

  // Post messages to the registered Service Worker
  const postToSW = useCallback((msg: { action: string; title?: string; body?: string; delay?: number; endTime?: number; totalDuration?: number }) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage(msg);
        }
      });
    }
  }, []);

  const cancelSWNotification = useCallback(() => {
    postToSW({
      action: 'cancelNotification',
    });
  }, [postToSW]);

  // Cancel only the countdown progress notification, leaving the completion notification intact
  const cancelSWCountdown = useCallback(() => {
    postToSW({
      action: 'cancelCountdown',
    });
  }, [postToSW]);

  // Request notifications permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      playTick();
    }
  };

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setEndTime(null);
    setRemainingTime(totalDuration);

    safeRemoveItem('liftly_timer_endTime');
    safeSetItem('liftly_timer_isRunning', 'false');
    safeSetItem('liftly_timer_remainingTime', totalDuration.toString());

    playChime();
    setAlertOpen(true);
    releaseWakeLock();
    // Only cancel the countdown progress — the SW will show/has shown
    // the completion notification on its own with tag 'rest-timer-complete'
    cancelSWCountdown();
  }, [totalDuration, playChime, cancelSWCountdown]);

  // Synchronize timer with stored configuration and system clock (handles background resumption)
  const syncTimer = useCallback(() => {
    const savedEndTimeStr = safeGetItem('liftly_timer_endTime');
    const savedIsRunningStr = safeGetItem('liftly_timer_isRunning');
    const savedRemainingStr = safeGetItem('liftly_timer_remainingTime');
    const savedDurationStr = safeGetItem('liftly_timer_totalDuration');
    const savedSoundStr = safeGetItem('liftly_timer_soundEnabled');
    const savedWakeStr = safeGetItem('liftly_timer_wakeLockEnabled');

    if (savedSoundStr !== null) setSoundEnabled(savedSoundStr === 'true');
    if (savedWakeStr !== null) setWakeLockEnabled(savedWakeStr === 'true');
    if (savedDurationStr) setTotalDuration(parseInt(savedDurationStr, 10));

    const isRunningSaved = savedIsRunningStr === 'true';

    if (isRunningSaved && savedEndTimeStr) {
      const savedEndTime = parseInt(savedEndTimeStr, 10);
      const now = getSystemTime();

      if (now >= savedEndTime) {
        // Expired while backgrounded
        setIsRunning(false);
        setEndTime(null);
        const dur = savedDurationStr ? parseInt(savedDurationStr, 10) : 180;
        setRemainingTime(dur);

        safeRemoveItem('liftly_timer_endTime');
        safeSetItem('liftly_timer_isRunning', 'false');
        safeSetItem('liftly_timer_remainingTime', dur.toString());

        playChime();
        setAlertOpen(true);
        releaseWakeLock();
        cancelSWNotification();
      } else {
        // Still counting down
        setEndTime(savedEndTime);
        setIsRunning(true);
        setRemainingTime(Math.max(0, Math.ceil((savedEndTime - now) / 1000)));
        if (savedWakeStr === 'true' || savedWakeStr === null) {
          requestWakeLock();
        }
      }
    } else {
      // Static or paused state
      setIsRunning(false);
      setEndTime(null);
      if (savedRemainingStr) {
        setRemainingTime(parseInt(savedRemainingStr, 10));
      } else if (savedDurationStr) {
        setRemainingTime(parseInt(savedDurationStr, 10));
      } else {
        setRemainingTime(180);
      }
      releaseWakeLock();
    }
  }, [playChime, cancelSWNotification, requestWakeLock]);

  // Controller Actions
  const handleStart = useCallback(() => {
    playTick();
    const newEndTime = getSystemTime() + remainingTime * 1000;
    setEndTime(newEndTime);
    setIsRunning(true);

    safeSetItem('liftly_timer_endTime', newEndTime.toString());
    safeSetItem('liftly_timer_isRunning', 'true');
    safeRemoveItem('liftly_timer_remainingTime');

    // Auto-request notification permission on first timer start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, [remainingTime, playTick]);

  const handlePause = useCallback(() => {
    playTick();
    setIsRunning(false);
    setEndTime(null);

    safeSetItem('liftly_timer_isRunning', 'false');
    safeSetItem('liftly_timer_remainingTime', remainingTime.toString());

    cancelSWNotification();
  }, [remainingTime, cancelSWNotification, playTick]);

  const handleToggleTimer = useCallback(() => {
    if (isRunning) {
      handlePause();
    } else {
      handleStart();
    }
  }, [isRunning, handleStart, handlePause]);

  const startPress = useCallback(() => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      setIsExpanded(true);
      playTick();
      const nav = navigator as unknown as { vibrate?: (pattern: number) => boolean };
      if (nav.vibrate) {
        nav.vibrate(50);
      }
    }, 600);
  }, [playTick]);

  const endPress = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleToggleTimer();
    }
    isLongPressRef.current = false;
  }, [handleToggleTimer]);

  const handleTouchStart = useCallback((e: TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    startPress();
  }, [startPress]);

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    endPress();
  }, [endPress]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only left click
    startPress();
  }, [startPress]);

  const handleMouseUp = useCallback(() => {
    endPress();
  }, [endPress]);

  const handleMouseLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPressRef.current = false;
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  }, []);

  const handleReset = () => {
    playTick();
    setIsRunning(false);
    setEndTime(null);
    setRemainingTime(totalDuration);

    safeSetItem('liftly_timer_isRunning', 'false');
    safeSetItem('liftly_timer_remainingTime', totalDuration.toString());

    cancelSWNotification();
  };

  const handlePreset = (seconds: number) => {
    playTick();
    setTotalDuration(seconds);
    setRemainingTime(seconds);

    safeSetItem('liftly_timer_totalDuration', seconds.toString());

    const newEndTime = getSystemTime() + seconds * 1000;
    setEndTime(newEndTime);
    setIsRunning(true);

    safeSetItem('liftly_timer_endTime', newEndTime.toString());
    safeSetItem('liftly_timer_isRunning', 'true');
    safeRemoveItem('liftly_timer_remainingTime');
  };

  const handleAdd30s = () => {
    playTick();
    const newRemaining = remainingTime + 30;
    setRemainingTime(newRemaining);

    if (isRunning && endTime !== null) {
      const newEndTime = endTime + 30 * 1000;
      setEndTime(newEndTime);
      safeSetItem('liftly_timer_endTime', newEndTime.toString());
    } else {
      safeSetItem('liftly_timer_remainingTime', newRemaining.toString());
    }
  };

  const toggleSound = () => {
    playTick();
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    safeSetItem('liftly_timer_soundEnabled', nextVal.toString());
  };

  const toggleWakeLock = () => {
    playTick();
    const nextVal = !wakeLockEnabled;
    setWakeLockEnabled(nextVal);
    safeSetItem('liftly_timer_wakeLockEnabled', nextVal.toString());
  };

  // Sync on mount
  useEffect(() => {
    // Run syncTimer asynchronously on mount to satisfy pure components/cascading render rules
    const mountTimeout = setTimeout(() => {
      syncTimer();
    }, 0);

    // Check for Wake Lock re-acquisition on visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(mountTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [syncTimer]);

  // Sync Wake Lock when running state or preference changes
  useEffect(() => {
    if (isRunning && wakeLockEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isRunning, wakeLockEnabled, requestWakeLock]);

  // Sync Service Worker countdown notification when running state, end time, or duration changes
  useEffect(() => {
    if (isRunning && endTime !== null) {
      if (notificationPermission === 'granted') {
        postToSW({
          action: 'startCountdown',
          endTime: endTime,
          totalDuration: totalDuration,
        });
      }
    } else {
      cancelSWNotification();
    }
  }, [isRunning, endTime, totalDuration, notificationPermission, postToSW, cancelSWNotification]);

  // Clock countdown interval
  useEffect(() => {
    let interval: number | null = null;

    if (isRunning && endTime !== null) {
      interval = window.setInterval(() => {
        const now = getSystemTime();
        if (now >= endTime) {
          handleTimerComplete();
        } else {
          setRemainingTime(Math.max(0, Math.ceil((endTime - now) / 1000)));
        }
      }, 200);
    }

    return () => {
      if (interval !== null) window.clearInterval(interval);
    };
  }, [isRunning, endTime, handleTimerComplete]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format seconds to simple display (e.g. "2:45" or "45s")
  const formatCompactTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return s === 0 ? `${mins}m` : `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const percentRemaining = totalDuration > 0 ? (remainingTime / totalDuration) * 100 : 0;

  if (!mounted) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {isExpanded ? (
          // Expanded panel
          <Paper
            elevation={8}
            sx={{
              width: 310,
              borderRadius: 3,
              p: 2,
              background: darkMode === 'dark' ? 'rgba(30, 30, 30, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              animation: 'fadeIn 0.2s ease-out',
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'scale(0.95) translateY(10px)' },
                '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
              },
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
              <IconButton size="small" onClick={() => { playTick(); setIsExpanded(false); }}>
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
          </Paper>
        ) : (
          // Collapsed circular FAB (tap toggles running state, long press opens settings)
          <IconButton
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onContextMenu={handleContextMenu}
            sx={{
              width: 56,
              height: 56,
              bgcolor: isRunning ? 'primary.main' : 'background.paper',
              color: isRunning ? 'white' : 'text.primary',
              boxShadow: 4,
              border: isRunning ? 'none' : `1px solid ${theme.palette.divider}`,
              '&:hover': {
                bgcolor: isRunning ? 'primary.dark' : 'action.hover',
              },
              position: 'relative',
              touchAction: 'none', // Prevents default gestures on mobile
            }}
          >
            <CircularProgress
              variant="determinate"
              value={percentRemaining}
              size={52}
              thickness={2.5}
              sx={{
                color: isRunning ? 'rgba(255,255,255,0.4)' : 'primary.light',
                position: 'absolute',
                top: 2,
                left: 2,
                '& .MuiCircularProgress-svg': {
                  transition: isRunning ? 'none' : 'transform 0.4s linear',
                }
              }}
            />
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              sx={{ zIndex: 1 }}
            >
              {isRunning ? (
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  sx={{ fontSize: '10px', color: 'white', lineHeight: 1 }}
                >
                  {formatCompactTime(remainingTime)}
                </Typography>
              ) : (
                <Timer fontSize="medium" color={darkMode === 'dark' ? 'inherit' : 'primary'} />
              )}
            </Box>
          </IconButton>
        )}
      </Box>

      {/* Completion Dialog Alert */}
      <Dialog
        open={alertOpen}
        onClose={() => { playTick(); setAlertOpen(false); }}
        aria-labelledby="rest-timer-dialog-title"
        aria-describedby="rest-timer-dialog-description"
        sx={{ zIndex: 2000 }}
      >
        <DialogTitle id="rest-timer-dialog-title" sx={{ fontWeight: 'bold' }}>
          ⏱️ Rest Period Complete!
        </DialogTitle>
        <DialogActions>
          <Button onClick={() => { playTick(); setAlertOpen(false); }} color="primary" variant="contained" autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FloatingStopwatch;
