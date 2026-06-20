import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, Stack, Tooltip, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { donorApi } from '../../api/donor.api.js';
import DonorViewDialog from './DonorViewDialog.jsx';

export default function DonorListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: donors = [], isLoading } = useQuery({ queryKey: ['donors'], queryFn: () => donorApi.list() });
  const [toDelete, setToDelete] = useState(null);
  const [toView, setToView] = useState(null);

  const del = useMutation({
    mutationFn: (id) => donorApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donors'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Donor deleted'); setToDelete(null); },
  });

  const columns = [
    { id: 'name', label: 'Name' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'pan', label: 'PAN' },
    { id: 'aadhaar', label: 'Aadhaar' },
    { id: 'passport', label: 'Passport' },
    { id: 'address', label: 'Address', render: (r) => <Box sx={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.address}</Box> },
    {
      id: '_actions', label: 'Actions', sortable: false, align: 'right',
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="View"><IconButton size="small" onClick={() => setToView(r)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => nav(`/donors/${r.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setToDelete(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Donor Master"
        subtitle="Manage donors, their identity documents, and addresses."
        actions={<Button startIcon={<AddIcon />} variant="contained" onClick={() => nav('/donors/new')}>Add Donor</Button>}
      />
      <DataTable
        rows={donors}
        columns={columns}
        searchKeys={['name', 'mobile', 'pan', 'aadhaar', 'passport', 'address']}
        emptyMessage={isLoading ? 'Loading…' : 'No donors yet'}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Donor"
        message={`Delete "${toDelete?.name}"? This cannot be undone.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
      <DonorViewDialog open={!!toView} donor={toView} onClose={() => setToView(null)} />
    </Box>
  );
}
