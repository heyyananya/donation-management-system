import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Chip, IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { userApi } from '../../api/user.api.js';
import { trustApi } from '../../api/trust.api.js';
import { useAuth } from '../../auth/authContext.jsx';

export default function UserListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: userApi.list });
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });
  const [toDelete, setToDelete] = useState(null);

  const trustNameById = new Map(trusts.map((t) => [t.id, t.name]));

  const del = useMutation({
    mutationFn: (id) => userApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted');
      setToDelete(null);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Could not delete user'),
  });

  const columns = [
    { id: 'username', label: 'Username' },
    { id: 'displayName', label: 'Display Name' },
    { id: 'email', label: 'Email' },
    {
      id: 'role',
      label: 'Role',
      render: (r) => (
        <Chip
          size="small"
          label={r.role === 'admin' ? 'Admin' : 'User'}
          color={r.role === 'admin' ? 'primary' : 'default'}
          variant={r.role === 'admin' ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      id: 'trustIds',
      label: 'Trust Access',
      sortable: false,
      render: (r) => {
        if (r.role === 'admin') {
          return <Box sx={{ color: 'text.secondary', fontSize: 13 }}>All trusts</Box>;
        }
        const ids = r.trustIds || [];
        if (!ids.length) return <Box sx={{ color: 'warning.main', fontSize: 13 }}>None assigned</Box>;
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {ids.map((id) => (
              <Chip key={id} size="small" variant="outlined" label={trustNameById.get(id) || id} />
            ))}
          </Stack>
        );
      },
    },
    {
      id: 'isActive',
      label: 'Status',
      render: (r) => (
        <Chip size="small" label={r.isActive ? 'Active' : 'Inactive'} color={r.isActive ? 'success' : 'default'} />
      ),
    },
    {
      id: '_actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => nav(`/users/${r.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={r.username === me?.username ? 'You cannot delete yourself' : 'Delete'}>
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={r.username === me?.username}
                onClick={() => setToDelete(r)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="User Master"
        subtitle="Create user accounts and choose which trusts each user can access."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => nav('/users/new')}>
            Add User
          </Button>
        }
      />
      <DataTable
        rows={users}
        columns={columns}
        searchKeys={['username', 'displayName', 'email', 'role']}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete User"
        message={`Delete "${toDelete?.username}"? They will be hidden and can no longer log in, but kept in records.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
    </Box>
  );
}
