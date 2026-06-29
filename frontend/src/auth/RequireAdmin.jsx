import { Navigate } from 'react-router-dom';
import { useAuth } from './authContext.jsx';

export default function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
