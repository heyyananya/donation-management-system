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
  name: '', address: '', area: '', taluka: '', district: '', establishDate: '',
  contactNumber: '', trustType: '', sanchalan: '', registrationNumber: '',
  registrationText: '', unitText: '', correspondenceAddress: '', phone: '',
  eightyGText: '', pan: '', panText: '', letterAddressLinesText: '', footerInformation: '',
};

export default function TrustFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: existing } = useQuery({ queryKey: ['trust', id], queryFn: () => trustApi.get(id), enabled: isEdit });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: initial });

  // Logo state — file picked by the user in this session, plus a local preview
  // URL so they see what they picked before clicking Save.
  const [logoFile, setLogoFile] = useState(null);
  const [logoLocalPreview, setLogoLocalPreview] = useState('');
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false);

  useEffect(() => {
    if (existing) {
      reset({
        ...initial,
        ...existing,
        letterAddressLinesText: (existing.letterAddressLines || []).join('\n'),
      });
    }
  }, [existing, reset]);

  // Clean up local preview Object URLs when the picked file changes.
  useEffect(() => {
    if (!logoFile) { setLogoLocalPreview(''); return undefined; }
    const url = URL.createObjectURL(logoFile);
    setLogoLocalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const save = useMutation({
    mutationFn: async (data) => {
      const payload = {
        ...data,
        letterAddressLines: (data.letterAddressLinesText || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
      };
      delete payload.letterAddressLinesText;
      const trust = isEdit ? await trustApi.update(id, payload) : await trustApi.create(payload);
      // Apply logo changes after the trust exists (needs an id).
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
        subtitle="Trust registration, legal and footer details shown on receipts/letters."
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => nav('/trusts')}>Back to list</Button>}
      />
      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Typography variant="overline" color="text.secondary">Identity</Typography>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={8}>
            <TextField label="Trust Name *" error={!!errors.name} helperText={errors.name?.message}
              {...register('name', { required: 'Trust Name is required' })} />
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
            <TextField label="Establish Date" type="date" InputLabelProps={{ shrink: true }} {...register('establishDate')} />
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
          Shown in the header of the Thanks Letter. Any image format works — PNG, JPG, GIF, WebP, SVG; non-PNG/JPG files are auto-converted to PNG on the server.
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
        <Typography variant="overline" color="text.secondary">Document header (printed on Receipt & Thanks Letter)</Typography>
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <TextField label="Registration Number" {...register('registrationNumber')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Trust PAN" inputProps={{ style: { textTransform: 'uppercase' } }} {...register('pan')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Registration Text" helperText='e.g. "(Registered Under Bombay Public Trust Act. 1950, NO. E/1075/Valsad )"'
              {...register('registrationText')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Unit Text" helperText='e.g. "(Balda & Nana Vaghchhipa Unit)"' {...register('unitText')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Correspondence Address" multiline rows={2}
              helperText="Multi-line address shown in the document header"
              {...register('correspondenceAddress')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Phone (in header)" {...register('phone')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="PAN Text (in header)" helperText='e.g. "PAN : AABTS3394J"' {...register('panText')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="80G Text" helperText='e.g. "IT 80 G Exemption Certificate No. AABTS3394JF20214 DT.31-05-2021"'
              {...register('eightyGText')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Letter address lines" multiline rows={3}
              helperText='Address used in the donor "To" block on the donation letter (one line per row).'
              {...register('letterAddressLinesText')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Footer Information" multiline rows={2} {...register('footerInformation')} />
          </Grid>
        </Grid>

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
