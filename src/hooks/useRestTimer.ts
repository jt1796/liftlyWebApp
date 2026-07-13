import { useState, useEffect, useRef, useCallback } from 'react';

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

export interface RestTimerState {
  totalDuration: number;
  remainingTime: number;
  isRunning: boolean;
  soundEnabled: boolean;
  wakeLockEnabled: boolean;
  alertOpen: boolean;
  notificationPermission: string;
  percentRemaining: number;
}

export interface RestTimerActions {
  handleStart: () => void;
  handlePause: () => void;
  handleToggleTimer: () => void;
  handleReset: () => void;
  handlePreset: (seconds: number) => void;
  handleAdd30s: () => void;
  toggleSound: () => void;
  toggleWakeLock: () => void;
  setAlertOpen: (open: boolean) => void;
  requestNotificationPermission: () => Promise<void>;
  playTick: () => void;
  formatTime: (secs: number) => string;
  formatCompactTime: (secs: number) => string;
}

export const useRestTimer = (): RestTimerState & RestTimerActions => {
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

  return {
    // State
    totalDuration,
    remainingTime,
    isRunning,
    soundEnabled,
    wakeLockEnabled,
    alertOpen,
    notificationPermission,
    percentRemaining,
    // Actions
    handleStart,
    handlePause,
    handleToggleTimer,
    handleReset,
    handlePreset,
    handleAdd30s,
    toggleSound,
    toggleWakeLock,
    setAlertOpen,
    requestNotificationPermission,
    playTick,
    formatTime,
    formatCompactTime,
  };
};
