import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-utils';
import { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import RestTimerProvider from './layout/RestTimer';

const ProtectedLayout = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <RestTimerProvider>
      {(timer) => (
        <>
          <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'row' }}>
            <CssBaseline />
            <Header handleDrawerToggle={handleDrawerToggle} timer={timer} />
            <Sidebar
              mobileOpen={mobileOpen}
              handleDrawerToggle={handleDrawerToggle}
              timer={timer}
            />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                overflow: 'auto',
              }}
            >
              <Toolbar sx={{ display: {sm: 'none'} }}/>
              <Outlet />
            </Box>
          </Box>
        </>
      )}
    </RestTimerProvider>
  );
};

export default ProtectedLayout;
