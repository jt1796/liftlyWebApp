import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Logout } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Sidebar = ({ mobileOpen, handleDrawerToggle }: SidebarProps) => {
  const { logout } = useAuth();

  const drawerContent = (
    <List>
      <ListItem disablePadding>
        <ListItemButton onClick={logout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </ListItem>
    </List>
  );

  return (
    mobileOpen ?
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
      :
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: 200,
        }}
        open
      >
        {drawerContent}
      </Drawer>
  );
};

export default Sidebar;
