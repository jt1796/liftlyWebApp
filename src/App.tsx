import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ProtectedLayout from './components/ProtectedLayout';
import NotFoundPage from './components/NotFoundPage';
import './App.css';

function App() {
  const { currentUser } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route
            path="/"
            element={
              <div>
                <h1>Welcome, {currentUser?.email}</h1>
              </div>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
