import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, IconButton, Stack, Tooltip, Menu, MenuItem,
  Grid, TextField, Paper, Chip, ListItemIcon, ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReceiptIcon from '@mui/icons-material/Receipt';
import EmailIcon from '@mui/icons-material/MailOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadForOfflineIcon from '@mui/icons-material/DownloadForOffline';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { receiptApi } from '../../api/receipt.api.js';
import { trustApi } from '../../api/trust.api.js';
import { pdfApi } from '../../api/pdf.api.js';
import { yearApi } from '../../api/year.api.js';
import { remarkApi } from '../../api/remark.api.js';
import { downloadBlob, openBlobInNewTab } from '../../utils/downloadBlob.js';
import { exportToExcel } from '../../utils/exportExcel.js';

const formatDate = (d) => (d ? dayjs(d).format('DD-MM-YYYY') : '');

const EMPTY_FILTERS = { financialYear: '', trustId: '', paymentType: '', remarkId: '' };

export default function ReceiptListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: yearApi.list });
  const { data: remarks = [] } = useQuery({ queryKey: ['remarks'], queryFn: remarkApi.list });
  const { data: meta } = useQuery({ queryKey: ['receipts', 'meta'], queryFn: receiptApi.meta });
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts', filters],
    queryFn: () => receiptApi.list(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))),
  });

  const [toDelete, setToDelete] = useState(null);
  const del = useMutation({
    mutationFn: (id) => receiptApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['receipts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Receipt deleted'); setToDelete(null); },
  });

  const fyOptions = useMemo(() => {
    return years.map((y) => y.name).sort().reverse();
  }, [years]);

  const columns = [
    { id: 'financialYear', label: 'FY', render: (r) => <Chip size="small" label={r.financialYear} /> },
    { id: 'number', label: 'Receipt #', render: (r) => <Box sx={{ fontWeight: 700 }}>{r.number}</Box> },
    { id: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { id: 'trustName', label: 'Trust' },
    { id: 'donorName', label: 'Donor' },
    { id: 'donorMobile', label: 'Mobile' },
    { id: 'amount', label: 'Amount', align: 'right', render: (r) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(r.amount) },
    { id: 'paymentType', label: 'Payment' },
    { id: 'remarkName', label: 'Remark' },
    {
      id: '_actions', label: 'Actions', sortable: false, align: 'right',
      render: (r) => <RowActions row={r} onEdit={() => nav(`/receipts/${r.id}/edit`)} onDelete={() => setToDelete(r)} />,
    },
  ];

  const handleExport = () => {
    exportToExcel(
      receipts,
      [
        { label: 'Financial Year', value: (r) => r.financialYear },
        { label: 'Receipt #', value: (r) => r.number },
        { label: 'Date', value: (r) => formatDate(r.date) },
        { label: 'Trust', value: (r) => r.trustName },
        { label: 'Donor', value: (r) => r.donorName },
        { label: 'Mobile', value: (r) => r.donorMobile },
        { label: 'Amount', value: (r) => r.amount },
        { label: 'Payment Type', value: (r) => r.paymentType },
        { label: 'Remark', value: (r) => r.remarkName },
      ],
      `Donation-Receipts-${dayjs().format('DD-MM-YYYY')}.xlsx`
    );
  };

  return (
    <Box>
      <PageHeader
        title="Donation Receipts"
        subtitle="Issue receipts and generate official documents."
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<DownloadForOfflineIcon />} onClick={handleExport} disabled={!receipts.length}>
              Export Excel
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => nav('/receipts/new')}>New Receipt</Button>
          </Stack>
        }
      />
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={4} md={3}>
            <TextField select label="Financial Year" size="small" fullWidth value={filters.financialYear} onChange={(e) => setFilters((f) => ({ ...f, financialYear: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {fyOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              {meta?.currentFinancialYear && !fyOptions.includes(meta.currentFinancialYear) && (
                <MenuItem value={meta.currentFinancialYear}>{meta.currentFinancialYear}</MenuItem>
              )}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField select label="Trust" size="small" fullWidth value={filters.trustId} onChange={(e) => setFilters((f) => ({ ...f, trustId: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {trusts.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField select label="Payment Type" size="small" fullWidth value={filters.paymentType} onChange={(e) => setFilters((f) => ({ ...f, paymentType: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {(meta?.paymentTypes || []).map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField select label="Remark" size="small" fullWidth value={filters.remarkId} onChange={(e) => setFilters((f) => ({ ...f, remarkId: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              {remarks.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
          </Grid>
        </Grid>
      </Paper>
      <DataTable
        rows={receipts}
        columns={columns}
        searchKeys={['donorName', 'trustName', 'number', 'remarkName', 'donorMobile']}
        emptyMessage={isLoading ? 'Loading…' : 'No receipts yet'}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Receipt"
        message={`Delete receipt #${toDelete?.number} for ${toDelete?.donorName}?`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
    </Box>
  );
}

function RowActions({ row, onEdit, onDelete }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);

  const handlePdf = async (type, mode) => {
    close();
    try {
      const blob = await pdfApi.download(type, row.id, { inline: mode !== 'download' });
      const fname = `${type === 'receipt' ? 'Receipt' : type === 'letter' ? 'DonationLetter' : 'ThanksLetter'}-${row.number}.pdf`;
      if (mode === 'download') downloadBlob(blob, fname);
      else openBlobInNewTab(blob);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to generate PDF');
    }
  };

  return (
    <>
      <Tooltip title="View"><IconButton size="small" onClick={() => handlePdf('receipt', 'inline')}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Edit"><IconButton size="small" onClick={onEdit}><EditIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="More"><IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={onDelete}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem onClick={() => handlePdf('receipt', 'inline')}>
          <ListItemIcon><ReceiptIcon fontSize="small" /></ListItemIcon><ListItemText>Receipt</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePdf('letter', 'inline')}>
          <ListItemIcon><EmailIcon fontSize="small" /></ListItemIcon><ListItemText>Donation Letter</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePdf('thanks-letter', 'inline')}>
          <ListItemIcon><FavoriteIcon fontSize="small" /></ListItemIcon><ListItemText>Thanks Letter</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePdf('receipt', 'inline')}>
          <ListItemIcon><PrintIcon fontSize="small" /></ListItemIcon><ListItemText>Print Receipt</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePdf('receipt', 'download')}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon><ListItemText>Download Receipt PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePdf('thanks-letter', 'download')}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon><ListItemText>Download Thanks Letter PDF</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
