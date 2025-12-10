import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Box,
} from '@mui/material';
import { Logout, FitnessCenter, ListAlt, QueryStats, Create, Brightness4, Brightness7, Construction } from '@mui/icons-material';
import { useAuth } from '../../contexts/auth-context-utils';
import { useApp } from '../../contexts/app-context-utils';
import { Link } from 'react-router-dom';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const { logout } = useAuth();
  const { darkMode, setDarkMode } = useApp();

  const handleThemeChange = () => {
    setDarkMode(darkMode === 'dark' ? 'light' : 'dark');
  };

  const drawerContent = (
    <List>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workout" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Create />
          </ListItemIcon>
          <ListItemText primary="New Workout" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workouts" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <ListAlt />
          </ListItemIcon>
          <ListItemText primary="My Workouts" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/templates" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <Construction />
          </ListItemIcon>
          <ListItemText primary="Templates" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/records" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <QueryStats />
          </ListItemIcon>
          <ListItemText primary="Records" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/exercises" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <FitnessCenter />
          </ListItemIcon>
          <ListItemText primary="Exercises" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton onClick={() => { logout(); handleDrawerToggle(); }}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <FormControlLabel
          control={<Switch checked={darkMode === 'dark'} onChange={handleThemeChange} />}
          label={
            <Box display="flex" alignItems="center">
              <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                {darkMode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </ListItemIcon>
              <ListItemText primary={darkMode === 'dark' ? 'Light Mode' : 'Dark Mode'} />
            </Box>
          }
          sx={{ ml: 1 }}
        />
      </ListItem>
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
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: 220,
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
