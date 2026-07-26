import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, IconButton, Stack, Tooltip, Box, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { donorApi } from '../../api/donor.api.js';
import { trustApi } from '../../api/trust.api.js';
import { exportToExcel } from '../../utils/exportExcel.js';
import { docTypeLabel } from '../../constants/donorDocTypes.js';
import DonorViewDialog from './DonorViewDialog.jsx';

export default function DonorListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: donors = [], isLoading } = useQuery({ queryKey: ['donors'], queryFn: () => donorApi.list() });
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });
  const trustNameById = new Map(trusts.map((t) => [t.id, t.name]));
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
    { id: 'voterId', label: 'Voter ID' },
    { id: 'passport', label: 'Passport' },
    { id: 'address', label: 'Address', render: (r) => <Box sx={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.address}</Box> },
    {
      id: 'trustIds',
      label: 'Trusts',
      sortable: false,
      render: (r) => {
        const ids = r.trustIds || [];
        if (!ids.length) return <Box sx={{ color: 'warning.main', fontSize: 13 }}>None</Box>;
        return (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ maxWidth: 260 }}>
            {ids.map((id) => (
              <Chip key={id} size="small" variant="outlined" label={trustNameById.get(id) || '—'} />
            ))}
          </Stack>
        );
      },
    },
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

  const handleExport = () => {
    exportToExcel(
      donors,
      [
        { label: 'Name', value: (r) => r.name },
        { label: 'Mobile', value: (r) => r.mobile },
        { label: 'PAN', value: (r) => r.pan },
        { label: 'Aadhaar', value: (r) => r.aadhaar },
        { label: 'Voter ID', value: (r) => r.voterId },
        { label: 'Passport', value: (r) => r.passport },
        { label: 'Address', value: (r) => r.address },
        { label: 'Trusts', value: (r) => (r.trustIds || []).map((id) => trustNameById.get(id) || '').filter(Boolean).join(', ') },
        { label: 'Documents Uploaded', value: (r) => (r.documents || []).map((d) => docTypeLabel(d.type)).join(', ') },
      ],
      `Donor-Master-${dayjs().format('DD-MM-YYYY')}.xlsx`
    );
  };

  return (
    <Box>
      <PageHeader
        title="Donor Master"
        subtitle="Manage donors, their identity documents, and addresses."
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<DownloadForOfflineIcon />} onClick={handleExport} disabled={!donors.length}>
              Export Excel
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => nav('/donors/new')}>Add Donor</Button>
          </Stack>
        }
      />
      <DataTable
        rows={donors}
        columns={columns}
        searchKeys={['name', 'mobile', 'pan', 'aadhaar', 'voterId', 'passport', 'address']}
        emptyMessage={isLoading ? 'Loading…' : 'No donors yet'}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Donor"
        message={`Delete "${toDelete?.name}"? It will be hidden from the list but kept in records.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
      <DonorViewDialog open={!!toView} donor={toView} onClose={() => setToView(null)} />
    </Box>
  );
}
