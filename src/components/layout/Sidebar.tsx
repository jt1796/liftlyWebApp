import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Logout, FitnessCenter, ListAlt, QueryStats } from '@mui/icons-material';
import { useAuth } from '../../contexts/auth-context-utils';
import { Link } from 'react-router-dom';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const { logout } = useAuth();

  const drawerContent = (
    <List>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workouts" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <ListAlt />
          </ListItemIcon>
          <ListItemText primary="My Workouts" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/exercises" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <QueryStats />
          </ListItemIcon>
          <ListItemText primary="Exercises" sx={{ marginRight: 5 }} />
        </ListItemButton>
      </ListItem>
      <ListItem disablePadding>
        <ListItemButton component={Link} to="/workout" onClick={handleDrawerToggle}>
          <ListItemIcon>
            <FitnessCenter />
          </ListItemIcon>
          <ListItemText primary="New Workout" sx={{ marginRight: 5 }} />
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
