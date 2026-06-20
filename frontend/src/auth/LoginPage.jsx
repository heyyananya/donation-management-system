import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Box, Paper, Stack, Typography, TextField, Button, InputAdornment, IconButton,
} from '@mui/material';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { toast } from 'react-toastify';
import { useAuth } from './authContext.jsx';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { username: '', password: '' },
  });
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (values) => {
    try {
      await login(values.username, values.password);
      toast.success('Welcome back');
      const to = loc.state?.from?.pathname || '/';
      nav(to, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 60%, #5EEAD4 100%)',
        p: 2,
      }}
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <Paper sx={{ p: 4, width: 380, maxWidth: '90vw', borderRadius: 3 }}>
          <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Box sx={{ bgcolor: 'primary.main', color: '#fff', width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
              <VolunteerActivismIcon />
            </Box>
            <Typography variant="h5">Donation Management</Typography>
            <Typography variant="body2" color="text.secondary">Sign in to continue</Typography>
          </Stack>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Username"
                autoFocus
                error={!!errors.username}
                helperText={errors.username?.message}
                {...register('username', { required: 'Username is required' })}
              />
              <TextField
                label="Password"
                type={showPass ? 'text' : 'password'}
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPass((s) => !s)} edge="end" size="small">
                        {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                {...register('password', { required: 'Password is required' })}
              />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </motion.div>
    </Box>
  );
}
