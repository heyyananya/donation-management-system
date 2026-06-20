import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, Button, Stack, Avatar, Typography, Divider } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { trustApi } from '../../api/trust.api.js';

const initial = {
  name: '',
  trustType: '',
  area: '',
  taluka: '',
  district: '',
  sanchalan: '',
  establishDate: '',
  contactNumber: '',
  address: '',
  correspondenceAddress: '',
};

export default function TrustFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({ queryKey: ['trust', id], queryFn: () => trustApi.get(id), enabled: isEdit });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial });

  const [logoFile, setLogoFile] = useState(null);
  const [logoLocalPreview, setLogoLocalPreview] = useState('');
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false);

  useEffect(() => {
    if (existing) {
      reset({
        ...initial,
        ...existing,
        // establish_date comes back as a YYYY-MM-DD string (or null) thanks to
        // the pg type parser; surface it directly to the date input.
        establishDate: existing.establishDate || '',
      });
    }
  }, [existing, reset]);

  useEffect(() => {
    if (!logoFile) { setLogoLocalPreview(''); return undefined; }
    const url = URL.createObjectURL(logoFile);
    setLogoLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const save = useMutation({
    mutationFn: async (data) => {
      const trust = isEdit ? await trustApi.update(id, data) : await trustApi.create(data);
      if (logoFile) {
        await trustApi.uploadLogo(trust.id, logoFile);
      } else if (isEdit && removeExistingLogo && existing?.logoFileName) {
        await trustApi.removeLogo(trust.id);
      }
      return trust;
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['trusts'] });
      qc.invalidateQueries({ queryKey: ['trust', saved.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Trust ${isEdit ? 'updated' : 'created'}`);
      setLogoFile(null);
      setRemoveExistingLogo(false);
      if (!isEdit) nav(`/trusts/${saved.id}/edit`, { replace: true });
    },
  });

  const existingLogoUrl =
    existing?.logoFileName && !removeExistingLogo
      ? `/api/files/trust-logos/${existing.logoFileName}`
      : '';
  const previewUrl = logoLocalPreview || existingLogoUrl;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Trust' : 'New Trust'}
        subtitle="Trust identity, logo, and the header block printed on Receipt & Thanks Letter."
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => nav('/trusts')}>Back to list</Button>}
      />
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Typography variant="overline" color="text.secondary">Identity</Typography>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={8}>
            <TextField
              label="Trust Name *"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', { required: 'Trust Name is required' })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Trust Type" {...register('trustType')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Area" {...register('area')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Taluka" {...register('taluka')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="District" {...register('district')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Trust Sanchalan" {...register('sanchalan')} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Establish Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...register('establishDate')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Contact Number" {...register('contactNumber')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Trust Address" multiline rows={2} {...register('address')} />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="overline" color="text.secondary">Trust Logo</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Shown at the top of the Receipt and Thanks Letter header. Any image format works — PNG, JPG, GIF, WebP, SVG; non-PNG/JPG files are auto-converted to PNG on the server.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 1 }}>
          <Avatar
            src={previewUrl}
            variant="rounded"
            sx={{ width: 80, height: 80, border: '1px solid #E2E8F0', bgcolor: '#F1F5F9', fontSize: 28 }}
          >
            {(existing?.name || '').slice(0, 1) || 'T'}
          </Avatar>
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {logoFile ? logoFile.name : (previewUrl ? 'Replace logo' : 'Choose logo')}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f) {
                  setLogoFile(f);
                  setRemoveExistingLogo(false);
                }
              }}
            />
          </Button>
          {(logoFile || existingLogoUrl) && (
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (logoFile) setLogoFile(null);
                else setRemoveExistingLogo(true);
              }}
            >
              Remove
            </Button>
          )}
        </Stack>
        {logoFile && (
          <Typography variant="caption" color="text.secondary">
            New logo will be uploaded when you {isEdit ? 'update' : 'create'} the trust.
          </Typography>
        )}
        {removeExistingLogo && (
          <Typography variant="caption" color="error">
            Current logo will be removed on save.
          </Typography>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="overline" color="text.secondary">
          Correspondence Address
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, mb: 1.5 }}>
          Printed below the Trust Name on the Receipt and Thanks Letter header. Line breaks, spacing and blank lines are preserved character-for-character. Press Enter for a new line — it never submits the form.
        </Typography>
        <TextField
          label="Correspondence Address"
          multiline
          minRows={14}
          maxRows={30}
          fullWidth
          InputProps={{
            sx: {
              fontFamily: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre',
            },
          }}
          error={!!errors.correspondenceAddress}
          helperText={errors.correspondenceAddress?.message}
          {...register('correspondenceAddress')}
        />

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
          <Button onClick={() => nav('/trusts')}>Cancel</Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting || save.isPending}>
            {isEdit ? 'Update Trust' : 'Create Trust'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
