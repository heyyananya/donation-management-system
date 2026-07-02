import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Paper, Grid, TextField, Button, Stack, Typography, Divider, Chip, MenuItem, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { donorApi } from '../../api/donor.api.js';
import { docTypeLabel } from '../../constants/donorDocTypes.js';
import { downloadDonorDoc } from '../../utils/downloadDonorDoc.js';

// The identity documents a donor can upload. At least one is required; a donor
// may have at most MAX_DOCS of them (the two upload slots below enforce this).
const IDENTITY_DOC_OPTIONS = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'voterId', label: 'Voter ID' },
  { value: 'pan', label: 'PAN Card' },
];
const MAX_DOCS = 2;
const emptySlots = () => [{ type: '', file: null }, { type: '', file: null }];

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
    defaultValues: { name: '', mobile: '', pan: '', aadhaar: '', voterId: '', passport: '', address: '' },
  });

  // Two upload slots: each { type, file }. Used to stage files while creating a
  // donor (they upload together on save). In edit mode each slot uploads on its
  // own via its Upload button.
  const [docSlots, setDocSlots] = useState(emptySlots);
  const setSlot = (i, next) => setDocSlots((s) => s.map((slot, idx) => (idx === i ? next : slot)));
  const [docError, setDocError] = useState('');
  const [identityError, setIdentityError] = useState('');

  useEffect(() => {
    if (existing) reset({
      name: existing.name || '', mobile: existing.mobile || '', pan: existing.pan || '',
      aadhaar: existing.aadhaar || '', voterId: existing.voterId || '',
      passport: existing.passport || '', address: existing.address || '',
    });
  }, [existing, reset]);

  const save = useMutation({
    mutationFn: (payload) => (isEdit
      ? donorApi.update(id, payload)
      : donorApi.createWithDocs(payload.values, payload.files)),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['donors'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Donor ${isEdit ? 'updated' : 'created'}`);
      if (!isEdit) nav(`/donors/${saved.id}/edit`, { replace: true });
    },
  });

  const onSubmit = (values) => {
    if (!values.pan && !values.aadhaar && !values.voterId) {
      setIdentityError('At least one of PAN Number, Aadhaar Number, or Voter ID Number is required.');
      return;
    }
    setIdentityError('');

    // Documents are uploaded per-slot in edit mode, so only the create flow
    // needs to validate & bundle the staged files here.
    if (isEdit) { save.mutate(values); return; }

    const filled = docSlots.filter((s) => s.file);
    if (!filled.length) {
      setDocError('Upload at least one document (Aadhaar Card, Voter ID, or PAN Card).');
      return;
    }
    if (filled.some((s) => !s.type)) {
      setDocError('Select the document type for each file you chose.');
      return;
    }
    const types = filled.map((s) => s.type);
    if (new Set(types).size !== types.length) {
      setDocError('The two documents must be of different types.');
      return;
    }
    setDocError('');
    const files = Object.fromEntries(filled.map((s) => [s.type, s.file]));
    save.mutate({ values, files });
  };

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
            <TextField label="Name *" error={!!errors.name} helperText={errors.name?.message} InputLabelProps={{ shrink: true }}
              {...register('name', { required: 'Name is required' })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Mobile Number *" error={!!errors.mobile} helperText={errors.mobile?.message || '10 digits'} InputLabelProps={{ shrink: true }}
              {...register('mobile', { required: 'Mobile is required', pattern: { value: /^\d{10}$/, message: 'Must be 10 digits' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="PAN Number" error={!!errors.pan} helperText={errors.pan?.message || 'Format: ABCDE1234F'} InputLabelProps={{ shrink: true }}
              inputProps={{ style: { textTransform: 'uppercase' } }}
              {...register('pan', { pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]$/i, message: 'Invalid PAN format' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Aadhaar Number" error={!!errors.aadhaar} helperText={errors.aadhaar?.message || '12 digits'} InputLabelProps={{ shrink: true }}
              {...register('aadhaar', { pattern: { value: /^\d{12}$/, message: 'Must be 12 digits' } })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Voter ID Number" helperText="e.g. ABC1234567" InputLabelProps={{ shrink: true }} {...register('voterId')} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Passport Number" InputLabelProps={{ shrink: true }} {...register('passport')} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color={identityError ? 'error' : 'text.secondary'}>
              {identityError || 'At least one of PAN Number, Aadhaar Number, or Voter ID Number is required.'}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address" multiline rows={3} InputLabelProps={{ shrink: true }} {...register('address')} />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Identity Documents {isEdit ? '' : '— at least one is required'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Select the document type, then choose the file. A donor can have at most {MAX_DOCS} documents.
            </Typography>
            {(() => {
              const existingDocs = existing?.documents || [];
              const existingTypes = existingDocs.map((d) => d.type);
              const atCapacity = isEdit && existingDocs.length >= MAX_DOCS;
              return (
                <Stack spacing={1.5}>
                  {docSlots.map((slot, i) => {
                    const otherType = docSlots[1 - i]?.type;
                    const disabledTypes = [...existingTypes, otherType].filter(Boolean);
                    return (
                      <DocSlot
                        key={i}
                        slot={slot}
                        onChange={(next) => setSlot(i, next)}
                        disabledTypes={disabledTypes}
                        isEdit={isEdit}
                        donorId={existing?.id}
                        disabled={atCapacity}
                      />
                    );
                  })}
                  {atCapacity && (
                    <Typography variant="caption" color="text.secondary">
                      Maximum {MAX_DOCS} documents reached. Remove one below to upload another.
                    </Typography>
                  )}
                  {!isEdit && docError && <Typography variant="caption" color="error">{docError}</Typography>}
                </Stack>
              );
            })()}
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

// One upload slot: a document-type dropdown plus a file picker. In create mode
// the chosen file is staged in the parent (uploaded together on save); in edit
// mode an Upload button sends it immediately to the existing donor.
function DocSlot({ slot, onChange, disabledTypes, isEdit, donorId, disabled }) {
  const qc = useQueryClient();
  const upload = useMutation({
    mutationFn: () => donorApi.uploadDoc(donorId, slot.file, slot.type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['donor', donorId] });
      qc.invalidateQueries({ queryKey: ['donors'] });
      toast.success('Document uploaded');
      onChange({ type: '', file: null });
    },
  });

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <TextField
        select size="small" label="Document Type" value={slot.type} disabled={disabled}
        onChange={(e) => onChange({ ...slot, type: e.target.value })}
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">— Select —</MenuItem>
        {IDENTITY_DOC_OPTIONS.map((o) => (
          <MenuItem key={o.value} value={o.value} disabled={disabledTypes.includes(o.value)}>{o.label}</MenuItem>
        ))}
      </TextField>
      <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}
        disabled={disabled} title={slot.file?.name || 'Choose file'}
        sx={{ maxWidth: 260, justifyContent: 'flex-start' }}>
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slot.file ? slot.file.name : 'Choose file'}
        </Box>
        <input type="file" hidden onChange={(e) => onChange({ ...slot, file: e.target.files?.[0] || null })} />
      </Button>
      {isEdit && (
        <Button variant="contained" size="small"
          disabled={disabled || !slot.type || !slot.file || upload.isPending}
          onClick={() => upload.mutate()}>
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      )}
    </Stack>
  );
}

// Read-only view of everything already uploaded (identity docs uploaded via
// the buttons above, plus any Passport/Other doc uploaded previously) — lets
// the admin open or remove a file. Uploading itself now only happens through
// the dedicated Aadhaar/Voter ID/PAN buttons above.
function DocumentsSection({ donor }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (docId) => donorApi.removeDoc(donor.id, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donor', donor.id] }); toast.success('Document removed'); },
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>Uploaded Documents</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {(donor?.documents || []).map((d) => (
          <Chip
            key={d.id}
            label={`${docTypeLabel(d.type)} · ${d.originalName}`}
            title={d.originalName}
            onClick={() => downloadDonorDoc(d)}
            onDelete={() => remove.mutate(d.id)}
            deleteIcon={<Tooltip title="Remove"><DeleteIcon /></Tooltip>}
            sx={{ maxWidth: 320 }}
          />
        ))}
        {!(donor?.documents || []).length && <Typography variant="body2" color="text.secondary">No documents uploaded yet.</Typography>}
      </Stack>
    </Box>
  );
}

void Controller;
