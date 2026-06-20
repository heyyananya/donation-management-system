import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, IconButton, Stack, Tooltip } from '@mui/material';
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
    { id: 'name', label: 'Trust Name' },
    { id: 'district', label: 'District' },
    { id: 'phone', label: 'Phone' },
    { id: 'pan', label: 'PAN' },
    { id: 'registrationNumber', label: 'Reg. No' },
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
        subtitle="Manage trusts, their registration details, and logos."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => nav('/trusts/new')}>Add Trust</Button>}
      />
      <DataTable
        rows={trusts}
        columns={columns}
        searchKeys={['name', 'district', 'pan', 'phone', 'registrationNumber']}
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
