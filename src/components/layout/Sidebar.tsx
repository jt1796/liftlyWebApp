import { useState } from 'react';
import {
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { Logout, FitnessCenter, ListAlt, QueryStats, Create, Palette, Construction, Terminal, PeopleAlt, Calculate, Check } from '@mui/icons-material';
import { useAuth } from '../../contexts/auth-context-utils';
import { useApp } from '../../contexts/app-context-utils';
import { Link } from 'react-router-dom';
import { SidebarTimerButton } from './RestTimer';
import type { useRestTimer } from '../../hooks/useRestTimer';
import { COLOR_THEMES } from '../../themes';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  timer: ReturnType<typeof useRestTimer>;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle, timer }: SidebarProps) => {
  const { logout } = useAuth();
  const { colorTheme, setColorTheme } = useApp();
  const [timerAnchorEl, setTimerAnchorEl] = useState<HTMLElement | null>(null);
  const [themeMenuAnchorEl, setThemeMenuAnchorEl] = useState<HTMLElement | null>(null);

  const darkThemes = COLOR_THEMES.filter((t) => t.baseMode === 'dark');
  const lightThemes = COLOR_THEMES.filter((t) => t.baseMode === 'light');

  const drawerContent = (
    <List>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workout" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Create />
          </ListItemIcon>
          <ListItemText primary="New Workout" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workouts" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <ListAlt />
          </ListItemIcon>
          <ListItemText primary="My Workouts" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/templates" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Construction />
          </ListItemIcon>
          <ListItemText primary="Templates" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/scripts" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Terminal />
          </ListItemIcon>
          <ListItemText primary="Scripts" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/records" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <QueryStats />
          </ListItemIcon>
          <ListItemText primary="Records" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/calculators" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Calculate />
          </ListItemIcon>
          <ListItemText primary="Calculators" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/friends" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <PeopleAlt />
          </ListItemIcon>
          <ListItemText primary="Friends" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/exercises" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <FitnessCenter />
          </ListItemIcon>
          <ListItemText primary="Exercises" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <Divider sx={{ my: 1 }} />
      <SidebarTimerButton
        timer={timer}
        anchorEl={timerAnchorEl}
        onOpen={(e) => setTimerAnchorEl(e.currentTarget)}
        onClose={() => setTimerAnchorEl(null)}
      />
      <Divider sx={{ my: 1 }} />
      <ListItem disablePadding>
        <ListItemButton onClick={() => { logout(); handleDrawerToggle(); }}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton onClick={(e) => setThemeMenuAnchorEl(e.currentTarget)}>
          <ListItemIcon>
            <Palette />
          </ListItemIcon>
          <ListItemText
            primary="Theme"
            secondary={COLOR_THEMES.find((t) => t.id === colorTheme)?.label}
            primaryTypographyProps={{ noWrap: true }}
            secondaryTypographyProps={{ noWrap: true }}
          />
        </ListItemButton>
      </ListItem>

      {/* Theme picker menu */}
      <Menu
        anchorEl={themeMenuAnchorEl}
        open={Boolean(themeMenuAnchorEl)}
        onClose={() => setThemeMenuAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              maxHeight: 420,
              minWidth: 200,
            },
          },
        }}
      >
        <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary' }}>
          Dark Themes
        </Typography>
        {darkThemes.map((t) => (
          <MenuItem
            key={t.id}
            selected={t.id === colorTheme}
            onClick={() => {
              setColorTheme(t.id);
              setThemeMenuAnchorEl(null);
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} width="100%">
              <Typography fontSize="1.2rem">{t.icon}</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{t.label}</Typography>
              {t.id === colorTheme && <Check fontSize="small" color="primary" />}
            </Box>
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <Typography variant="overline" sx={{ px: 2, pt: 1, display: 'block', color: 'text.secondary' }}>
          Light Themes
        </Typography>
        {lightThemes.map((t) => (
          <MenuItem
            key={t.id}
            selected={t.id === colorTheme}
            onClick={() => {
              setColorTheme(t.id);
              setThemeMenuAnchorEl(null);
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5} width="100%">
              <Typography fontSize="1.2rem">{t.icon}</Typography>
              <Typography variant="body2" sx={{ flex: 1 }}>{t.label}</Typography>
              {t.id === colorTheme && <Check fontSize="small" color="primary" />}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </List>
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 220 },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: 220,
          flexShrink: 0,
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 220 },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;

