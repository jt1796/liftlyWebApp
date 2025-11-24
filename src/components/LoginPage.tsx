
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { currentUser, logout } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  if (currentUser) {
    return <div>
      <h1>Welcome {currentUser.email}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  }

  return (
    <div>
      <h1>Welcome to Liftly</h1>
      <button onClick={handleSignIn}>Sign in with Google</button>
    </div>
  );
};

export default LoginPage;
