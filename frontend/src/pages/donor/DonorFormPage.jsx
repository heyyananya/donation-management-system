import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, Button, Stack, Typography, Divider, MenuItem, Chip, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { donorApi } from '../../api/donor.api.js';

const DOC_TYPES = [
  { value: 'pan', label: 'PAN' },
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

export default function DonorFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['donor', id],
    queryFn: () => donorApi.get(id),
    enabled: isEdit,
  });

  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: '', mobile: '', pan: '', aadhaar: '', passport: '', address: '' },
  });

  useEffect(() => {
    if (existing) reset({
      name: existing.name || '', mobile: existing.mobile || '', pan: existing.pan || '',
      aadhaar: existing.aadhaar || '', passport: existing.passport || '', address: existing.address || '',
    });
  }, [existing, reset]);

  const save = useMutation({
    mutationFn: (data) => (isEdit ? donorApi.update(id, data) : donorApi.create(data)),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Donor ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) nav(`/donors/${saved.id}/edit`, { replace: true });
    },
  });

  const onSubmit = (values) => save.mutate(values);

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Donor' : 'New Donor'}
        subtitle="Donor identity & document details."
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => nav('/donors')}>Back to list</Button>}
      />
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <TextField label="Name *" error={!!errors.name} helperText={errors.name?.message}
              {...register('name', { required: 'Name is required' })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Mobile Number *" error={!!errors.mobile} helperText={errors.mobile?.message || '10 digits'}
              {...register('mobile', { required: 'Mobile is required', pattern: { value: /^\d{10}$/, message: 'Must be 10 digits' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="PAN Number" error={!!errors.pan} helperText={errors.pan?.message || 'Format: ABCDE1234F'}
              inputProps={{ style: { textTransform: 'uppercase' } }}
              {...register('pan', { pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]$/i, message: 'Invalid PAN format' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Aadhaar Number" error={!!errors.aadhaar} helperText={errors.aadhaar?.message || '12 digits'}
              {...register('aadhaar', { pattern: { value: /^\d{12}$/, message: 'Must be 12 digits' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Passport Number" {...register('passport')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" multiline rows={3} {...register('address')} />
          </Grid>
          <Grid item xs={12}>
            <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
              <Button onClick={() => nav('/donors')}>Cancel</Button>
              <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting || save.isPending}>
                {isEdit ? 'Update Donor' : 'Create Donor'}
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {isEdit && (
          <>
            <Divider sx={{ my: 3 }} />
            <DocumentsSection donor={existing} />
          </>
        )}
      </Paper>
    </Box>
  );
}

function DocumentsSection({ donor }) {
  const qc = useQueryClient();
  const [type, setType] = useState('pan');
  const [file, setFile] = useState(null);

  const upload = useMutation({
    mutationFn: () => donorApi.uploadDoc(donor.id, file, type),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donor', donor.id] }); qc.invalidateQueries({ queryKey: ['donors'] }); toast.success('Document uploaded'); setFile(null); },
  });
  const remove = useMutation({
    mutationFn: (docId) => donorApi.removeDoc(donor.id, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donor', donor.id] }); toast.success('Document removed'); },
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Documents</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ maxWidth: 200 }}>
          {DOC_TYPES.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
        </TextField>
        <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ whiteSpace: 'nowrap' }}>
          {file ? file.name : 'Choose file'}
          <input type="file" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Button>
        <Button variant="contained" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
          Upload
        </Button>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(donor?.documents || []).map((d) => (
          <Chip
            key={d.id}
            label={`${d.type.toUpperCase()} · ${d.originalName}`}
            onClick={() => window.open(d.url, '_blank', 'noopener')}
            onDelete={() => remove.mutate(d.id)}
            deleteIcon={<Tooltip title="Remove"><DeleteIcon /></Tooltip>}
          />
        ))}
        {!(donor?.documents || []).length && <Typography variant="body2" color="text.secondary">No documents uploaded yet.</Typography>}
      </Stack>
    </Box>
  );
}

void Controller;
