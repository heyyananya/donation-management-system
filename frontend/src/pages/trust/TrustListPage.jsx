import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, IconButton, Stack, Tooltip, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { trustApi } from '../../api/trust.api.js';

export default function TrustListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });
  const [toDelete, setToDelete] = useState(null);

  const del = useMutation({
    mutationFn: (id) => trustApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trusts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Trust deleted'); setToDelete(null); },
  });

  const columns = [
    {
      id: 'logoFileName',
      label: 'Logo',
      sortable: false,
      render: (r) => (
        <Avatar
          variant="rounded"
          src={r.logoFileName ? `/api/files/trust-logos/${r.logoFileName}` : ''}
          sx={{ width: 36, height: 36, bgcolor: '#F1F5F9', fontSize: 14 }}
        >
          {(r.name || '').slice(0, 1) || 'T'}
        </Avatar>
      ),
      width: 60,
    },
    { id: 'name', label: 'Trust Name' },
    {
      id: 'correspondenceAddress',
      label: 'Header preview',
      render: (r) => {
        const preview = (r.correspondenceAddress || '').split('\n').slice(0, 2).join(' · ');
        return (
          <Box sx={{ maxWidth: 360, color: 'text.secondary', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {preview}
          </Box>
        );
      },
    },
    {
      id: '_actions', label: 'Actions', sortable: false, align: 'right',
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Edit"><IconButton size="small" onClick={() => nav(`/trusts/${r.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setToDelete(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Trust Master"
        subtitle="Manage trusts: name, logo, and the printed document header."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => nav('/trusts/new')}>Add Trust</Button>}
      />
      <DataTable
        rows={trusts}
        columns={columns}
        searchKeys={['name', 'correspondenceAddress']}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Trust"
        message={`Delete "${toDelete?.name}"? Trusts with existing receipts cannot be deleted.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
    </Box>
  );
}
