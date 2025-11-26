import { Container, Typography, Button } from '@mui/material';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../contexts/auth-context-utils';
import { useLocation, Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  if (currentUser) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        paddingLeft: '1rem',
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Liftly
      </Typography>
      <Button variant="contained" onClick={handleSignIn}>Sign in with Google</Button>
    </Container>
  );
};

export default LoginPage;
