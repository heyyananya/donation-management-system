import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './authContext.jsx';

export default function RequireAuth({ children }) {
  const { isAuthenticated, bootstrapped } = useAuth();
  const location = useLocation();
  if (!bootstrapped) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
