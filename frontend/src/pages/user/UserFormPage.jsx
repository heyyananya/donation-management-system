import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Paper, Grid, TextField, Button, Stack, Typography, MenuItem,
  Checkbox, FormControlLabel, FormGroup, Divider, Alert, Switch,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { userApi } from '../../api/user.api.js';
import { trustApi } from '../../api/trust.api.js';
import { useAuth } from '../../auth/authContext.jsx';

const initial = {
  username: '',
  displayName: '',
  email: '',
  role: 'user',
  isActive: true,
  password: '',
  trustIds: [],
};

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuth();

  const { data: existing } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.get(id),
    enabled: isEdit,
  });
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });

  const {
    control, register, handleSubmit, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: initial });

  const role = watch('role');
  const trustIds = watch('trustIds') || [];
  const isSelf = isEdit && existing?.username && me?.username && existing.username.toLowerCase() === me.username.toLowerCase();

  const [showPasswordField, setShowPasswordField] = useState(!isEdit);

  useEffect(() => {
    if (existing) {
      reset({
        ...initial,
        username: existing.username || '',
        displayName: existing.displayName || '',
        email: existing.email || '',
        role: existing.role || 'user',
        isActive: !!existing.isActive,
        password: '',
        trustIds: existing.trustIds || [],
      });
      setShowPasswordField(false);
    }
  }, [existing, reset]);

  const save = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (isEdit && !payload.password) delete payload.password;
      if (payload.role === 'admin') payload.trustIds = [];
      return isEdit ? userApi.update(id, payload) : userApi.create(payload);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      if (saved?.id) qc.invalidateQueries({ queryKey: ['user', saved.id] });
      toast.success(`User ${isEdit ? 'updated' : 'created'}`);
      nav('/users');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not save user'),
  });

  function toggleTrust(tid, checked) {
    const next = checked
      ? [...new Set([...trustIds, tid])]
      : trustIds.filter((x) => x !== tid);
    setValue('trustIds', next, { shouldDirty: true });
  }

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit User' : 'New User'}
        subtitle="Set login credentials, role, and which trusts the user may access."
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => nav('/users')}>Back to list</Button>}
      />
      <Paper
        sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}
        component="form"
        onSubmit={handleSubmit((v) => save.mutate(v))}
      >
        <Typography variant="overline" color="text.secondary">Account</Typography>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Username *"
              error={!!errors.username}
              helperText={errors.username?.message}
              {...register('username', { required: 'Username is required' })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Display Name" {...register('displayName')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Email" type="email" {...register('email')} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <TextField select label="Role *" {...field} disabled={isSelf}>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              )}
            />
            {isSelf && (
              <Typography variant="caption" color="text.secondary">
                You cannot change your own role.
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={3}>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!field.value}
                      onChange={(_, v) => field.onChange(v)}
                      disabled={isSelf}
                    />
                  }
                  label={field.value ? 'Active' : 'Inactive'}
                />
              )}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="overline" color="text.secondary">Password</Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 0.5, mb: 1.5 }}>
          {isEdit && (
            <Button
              size="small"
              variant={showPasswordField ? 'contained' : 'outlined'}
              onClick={() => setShowPasswordField((s) => !s)}
            >
              {showPasswordField ? 'Cancel password change' : 'Change password'}
            </Button>
          )}
          {!isEdit && (
            <Typography variant="caption" color="text.secondary">
              Minimum 6 characters.
            </Typography>
          )}
        </Stack>
        {(showPasswordField || !isEdit) && (
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={6}>
              <TextField
                label={isEdit ? 'New Password *' : 'Password *'}
                type="password"
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password', {
                  required: showPasswordField || !isEdit ? 'Password is required' : false,
                  minLength: { value: 6, message: 'Minimum 6 characters' },
                })}
              />
            </Grid>
          </Grid>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="overline" color="text.secondary">Trust Access</Typography>
        {role === 'admin' ? (
          <Alert severity="info" sx={{ mt: 1 }}>
            Admins have unrestricted access to all trusts. Trust assignments are only
            relevant when the role is set to <strong>User</strong>.
          </Alert>
        ) : (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Pick the trusts this user is allowed to see and operate on.
            </Typography>
            {trusts.length === 0 ? (
              <Alert severity="warning">
                No trusts exist yet. Create a trust in <strong>Trust Master</strong> first.
              </Alert>
            ) : (
              <FormGroup>
                <Grid container spacing={1}>
                  {trusts.map((t) => (
                    <Grid item xs={12} sm={6} md={4} key={t.id}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={trustIds.includes(t.id)}
                            onChange={(_, checked) => toggleTrust(t.id, checked)}
                          />
                        }
                        label={t.name}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            )}
            {role === 'user' && trustIds.length === 0 && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                A non-admin user must have at least one trust assigned.
              </Typography>
            )}
          </Box>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
          <Button onClick={() => nav('/users')}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isSubmitting || save.isPending}
          >
            {isEdit ? 'Update User' : 'Create User'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
