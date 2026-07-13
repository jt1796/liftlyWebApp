import React, { useMemo } from 'react';
import { Box, Typography, useTheme, useMediaQuery, alpha } from '@mui/material';
import dayjs from 'dayjs';
import type { Workout } from '../types';

interface WorkoutHeatmapProps {
  workouts: Workout[];
}

const WorkoutHeatmap: React.FC<WorkoutHeatmapProps> = ({ workouts }) => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const cellSize = isXs ? 4 : isMobile ? 4 : isTablet ? 8 : 12;
  const cellGap = isXs ? 1 : isMobile ? 1 : isTablet ? 1.5 : 2;
  const labelWidth = isXs ? 14 : isMobile ? 16 : isTablet ? 24 : 32;

  const primary = theme.palette.primary.main;
  const emptyColor = alpha(primary, theme.palette.mode === 'dark' ? 0.08 : 0.1);
  const filledColor = alpha(primary, 0.85);

  const data = useMemo(() => {
    const today = dayjs().startOf('day');
    const startOfPeriod = today.subtract(1, 'year').add(1, 'day'); // 365 days total

    // Create a map of date strings to workout counts
    const workoutCounts: Record<string, number> = {};
    workouts.forEach((w) => {
      const dateStr = dayjs(w.date).format('YYYY-MM-DD');
      workoutCounts[dateStr] = (workoutCounts[dateStr] || 0) + 1;
    });

    // We want the grid to end on the current week.
    // GitHub's grid is columns of weeks.
    // To make sure the last column is the current week, we align the grid.
    const gridStart = startOfPeriod.startOf('week');
    const gridEnd = today.endOf('week');

    let iter = gridStart;
    const weeks = [];
    let currentWeek = [];

    while (iter.isBefore(gridEnd) || iter.isSame(gridEnd, 'day')) {
      const dateStr = iter.format('YYYY-MM-DD');
      const count = workoutCounts[dateStr] || 0;

      currentWeek.push({
        date: iter,
        count,
        isOutOfRange: iter.isBefore(startOfPeriod) || iter.isAfter(today)
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      iter = iter.add(1, 'day');
    }

    return weeks;
  }, [workouts]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = [];
    let lastMonth = -1;

    data.forEach((week, index) => {
      const firstDayOfWeek = week[0].date;
      const month = firstDayOfWeek.month();
      if (month !== lastMonth) {
        labels.push({ label: firstDayOfWeek.format('MMM'), index });
        lastMonth = month;
      }
    });

    // Filter labels that are too close to each other
    return labels.filter((l, i) => i === 0 || l.index - labels[i-1].index > (isMobile ? 4 : 2));
  }, [data, isMobile]);

  const getColor = (count: number, isOutOfRange: boolean) => {
    if (isOutOfRange) return 'transparent';
    if (count === 0) return emptyColor;
    return filledColor;
  };

  return (
    <Box sx={{ width: '100%', overflowX: isMobile ? 'hidden' : 'auto', py: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: 'max-content', mx: 'auto' }}>
        {/* Month Labels */}
        <Box sx={{ display: 'flex', mb: 1 }}>
          <Box sx={{ width: labelWidth, mr: `${cellGap}px` }} /> {/* Spacer for Day labels */}
          <Box sx={{ position: 'relative', height: isMobile ? 14 : 20, flex: 1 }}>
            {monthLabels.map((label, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{
                  position: 'absolute',
                  left: label.index * (cellSize + cellGap),
                  whiteSpace: 'nowrap',
                  color: 'text.secondary',
                  fontSize: isMobile ? '0.5rem' : '0.7rem'
                }}
              >
                {label.label}
              </Typography>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex' }}>
          {/* Day Labels */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${cellGap}px`, mr: `${cellGap}px`, pt: '1px', width: labelWidth }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <Box key={day} sx={{ height: cellSize, display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: isMobile ? '0.5rem' : '0.65rem',
                    color: 'text.secondary',
                    visibility: [0, 2, 4, 6].includes(i) ? 'hidden' : 'visible',
                    lineHeight: 1
                  }}
                >
                  {day}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* The Grid */}
          <Box sx={{ display: 'flex', gap: `${cellGap}px` }}>
            {data.map((week, weekIndex) => (
              <Box key={weekIndex} sx={{ display: 'flex', flexDirection: 'column', gap: `${cellGap}px` }}>
                {week.map((day, dayIndex) => (
                  <Box
                    key={dayIndex}
                    sx={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: getColor(day.count, day.isOutOfRange),
                      borderRadius: isMobile ? '1px' : '2px',
                    }}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default WorkoutHeatmap;
