import { useState } from 'react';
import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { Menu } from '@mui/icons-material';
import { AppBarTimerButton } from './RestTimer';
import type { useRestTimer } from '../../hooks/useRestTimer';

interface HeaderProps {
    handleDrawerToggle: () => void;
    timer: ReturnType<typeof useRestTimer>;
}

const Header = ({ handleDrawerToggle, timer }: HeaderProps) => {
  const [timerAnchorEl, setTimerAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <AppBar
      position="fixed"
      sx={{
        display: { sm: 'none' }, // Only show on mobile
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2 }}
        >
          <Menu />
        </IconButton>
        <Typography variant="h6" noWrap component="div">
          Liftly
        </Typography>
        <AppBarTimerButton
          timer={timer}
          anchorEl={timerAnchorEl}
          onOpen={(e) => setTimerAnchorEl(e.currentTarget)}
          onClose={() => setTimerAnchorEl(null)}
        />
      </Toolbar>
    </AppBar>
  );
};

export default Header;
