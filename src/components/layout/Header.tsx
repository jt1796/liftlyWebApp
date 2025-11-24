import { AppBar, IconButton, Toolbar, Typography } from '@mui/material';
import { Menu } from '@mui/icons-material';

interface HeaderProps {
    handleDrawerToggle: () => void;
}

const Header = ({ handleDrawerToggle }: HeaderProps) => {
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
      </Toolbar>
    </AppBar>
  );
};

export default Header;
