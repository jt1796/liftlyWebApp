import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
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
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  return (
    <div>
      <h1>Welcome to Liftly</h1>
      <button onClick={handleSignIn}>Sign in with Google</button>
    </div>
  );
};

export default LoginPage;
