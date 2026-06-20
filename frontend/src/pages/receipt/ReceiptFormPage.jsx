import { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Paper, Grid, TextField, Button, Stack, MenuItem, Typography, Autocomplete, Divider, InputAdornment, Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { receiptApi } from '../../api/receipt.api.js';
import { donorApi } from '../../api/donor.api.js';
import { trustApi } from '../../api/trust.api.js';
import { remarkApi } from '../../api/remark.api.js';
import { yearApi } from '../../api/year.api.js';
import { currentFinancialYear } from '../../utils/financialYear.js';

const initial = {
  financialYear: '',
  trustId: '',
  donorId: '',
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  paymentType: 'Cash',
  remarkId: '',
  remarks: '',
  chequeNumber: '',
  chequeDate: '',
  transactionNumber: '',
  transactionDate: '',
  bankName: '',
};

const CHEQUE = new Set(['Cheque', 'Demand Draft']);
const ONLINE = new Set(['NEFT', 'RTGS', 'IMPS', 'UPI', 'Bank Transfer']);

export default function ReceiptFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: meta } = useQuery({ queryKey: ['receipts', 'meta'], queryFn: receiptApi.meta });
  const { data: trusts = [] } = useQuery({ queryKey: ['trusts'], queryFn: trustApi.list });
  const { data: donors = [] } = useQuery({ queryKey: ['donors'], queryFn: () => donorApi.list() });
  const { data: remarks = [] } = useQuery({ queryKey: ['remarks'], queryFn: remarkApi.list });
  const { data: years = [] } = useQuery({ queryKey: ['years'], queryFn: yearApi.list });
  const { data: existing } = useQuery({ queryKey: ['receipt', id], queryFn: () => receiptApi.get(id), enabled: isEdit });

  const { register, handleSubmit, control, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { ...initial, financialYear: currentFinancialYear() },
  });

  // For new receipts: keep the FY field anchored to an option that's actually
  // in the active-years list. When the active years arrive (or change) and the
  // current selection isn't valid, fall back to the first available active year.
  // Edit mode keeps whatever FY the receipt was issued under.

  useEffect(() => {
    if (existing) {
      reset({
        ...initial,
        ...existing,
        date: existing.date || initial.date,
        chequeDate: existing.chequeDate || '',
        transactionDate: existing.transactionDate || '',
      });
    }
  }, [existing, reset]);

  const watched = useWatch({ control });
  const showCheque = CHEQUE.has(watched.paymentType);
  const showOnline = ONLINE.has(watched.paymentType);

  // Peek next receipt number live as FY/trust change (only for new receipts).
  const { data: peek } = useQuery({
    queryKey: ['peekNumber', watched.financialYear, watched.trustId],
    queryFn: () => receiptApi.peekNumber(watched.financialYear, watched.trustId),
    enabled: !isEdit && !!watched.financialYear && !!watched.trustId,
  });

  const save = useMutation({
    mutationFn: (values) => (isEdit ? receiptApi.update(id, values) : receiptApi.create(values)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Receipt ${isEdit ? 'updated' : 'created'}`);
      nav('/receipts');
    },
  });

  const fyOptions = useMemo(() => {
    const active = years.filter((y) => y.isActive).map((y) => y.name);
    // When editing, always show the FY the receipt was issued under, even if
    // that year has since been marked inactive — otherwise the dropdown would
    // appear empty for a perfectly valid receipt.
    if (isEdit && existing?.financialYear && !active.includes(existing.financialYear)) {
      active.unshift(existing.financialYear);
    }
    return [...new Set(active)].sort().reverse();
  }, [years, isEdit, existing]);

  useEffect(() => {
    if (isEdit) return;
    const current = watched?.financialYear;
    if (current && fyOptions.includes(current)) return;
    if (fyOptions.length) setValue('financialYear', fyOptions[0]);
    else setValue('financialYear', '');
  }, [fyOptions, isEdit, setValue, watched?.financialYear]);
  void meta;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit Receipt' : 'New Donation Receipt'}
        subtitle="Receipt numbers are auto-assigned per Trust & Financial Year."
        actions={<Button startIcon={<ArrowBackIcon />} onClick={() => nav('/receipts')}>Back to list</Button>}
      />

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} component="form" onSubmit={handleSubmit((v) => save.mutate(v))}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            {isEdit ? (
              // After issue, FY is locked. Display the FY name directly so the
              // field always reads correctly even before /api/years finishes loading.
              <TextField
                label="Financial Year"
                value={existing?.financialYear || ''}
                disabled
                helperText="Locked after issue"
              />
            ) : (
              <Controller
                name="financialYear"
                control={control}
                rules={{ required: 'Financial Year is required' }}
                render={({ field }) => (
                  <TextField
                    select
                    label="Financial Year *"
                    {...field}
                    // Only let MUI render the value when a matching option exists,
                    // otherwise it would show the raw value as a free-text fallback.
                    value={fyOptions.includes(field.value) ? field.value : ''}
                    error={!!errors.financialYear}
                    helperText={errors.financialYear?.message}
                  >
                    {fyOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </TextField>
                )}
              />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            {isEdit ? (
              // Same idea for Trust — surface the decorated trustName from the
              // receipt response instead of risking a UUID flash while
              // /api/trusts is in flight.
              <TextField
                label="Trust"
                value={existing?.trustName || ''}
                disabled
                helperText="Locked after issue"
              />
            ) : (
              <Controller
                name="trustId"
                control={control}
                rules={{ required: 'Trust is required' }}
                render={({ field }) => {
                  const known = trusts.some((t) => t.id === field.value);
                  return (
                    <TextField
                      select
                      label="Trust *"
                      {...field}
                      value={known ? field.value : ''}
                      error={!!errors.trustId}
                      helperText={errors.trustId?.message || (trusts.length ? '' : 'Loading trusts…')}
                    >
                      {trusts.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </TextField>
                  );
                }}
              />
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Receipt Number"
              value={isEdit ? existing?.number || '' : (peek?.next ?? '')}
              disabled
              InputProps={{
                endAdornment: !isEdit && peek?.next ? <InputAdornment position="end"><Chip size="small" label="Auto" /></InputAdornment> : null,
              }}
              helperText={isEdit ? 'Locked after issue' : 'Auto-assigned on save (FY + Trust)'}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="donorId"
              control={control}
              rules={{ required: 'Donor is required' }}
              render={({ field }) => {
                const matched = donors.find((d) => d.id === field.value) || null;
                // While the donors list is still loading on an edit page we
                // fall back to the decorated donorName from the receipt itself
                // so the input never displays an empty box or a raw UUID.
                const fallback =
                  !matched && isEdit && existing?.donorName
                    ? { id: field.value, name: existing.donorName, mobile: existing.donorMobile || '' }
                    : null;
                const value = matched || fallback;
                return (
                  <Autocomplete
                    options={donors}
                    getOptionLabel={(o) => `${o.name}${o.mobile ? ` · ${o.mobile}` : ''}`}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={value}
                    onChange={(_e, v) => field.onChange(v?.id || '')}
                    loading={!donors.length}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Donor *"
                        error={!!errors.donorId}
                        helperText={
                          errors.donorId?.message ||
                          (matched?.pan ? `PAN: ${matched.pan}` : '')
                        }
                      />
                    )}
                  />
                );
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Date *" type="date" InputLabelProps={{ shrink: true }} error={!!errors.date} helperText={errors.date?.message}
              {...register('date', { required: 'Date is required' })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField label="Amount *" type="number" inputProps={{ min: 1, step: 1 }} error={!!errors.amount} helperText={errors.amount?.message}
              {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Must be > 0' } })} />
          </Grid>

          <Grid item xs={12} md={4}>
            <Controller
              name="paymentType"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField select label="Payment Type *" {...field}>
                  {(meta?.paymentTypes || ['Cash', 'Cheque', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'Bank Transfer', 'Demand Draft']).map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="remarkId"
              control={control}
              render={({ field }) => {
                const known = !field.value || remarks.some((r) => r.id === field.value);
                return (
                  <TextField
                    select
                    label="Remark (purpose)"
                    {...field}
                    value={known ? field.value : ''}
                    helperText={
                      !known && isEdit && existing?.remarkName
                        ? `Currently: ${existing.remarkName}`
                        : ''
                    }
                  >
                    <MenuItem value="">— None —</MenuItem>
                    {remarks.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                  </TextField>
                );
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Free-text Remarks" {...register('remarks')} />
          </Grid>

          {(showCheque || showOnline) && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="overline" color="text.secondary">{showCheque ? 'Cheque / DD Details' : 'Transaction Details'}</Typography>
            </Grid>
          )}

          {showCheque && (
            <>
              <Grid item xs={12} md={4}>
                <TextField label="Cheque / DD No. *" {...register('chequeNumber', { required: 'Required' })}
                  error={!!errors.chequeNumber} helperText={errors.chequeNumber?.message} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Cheque / DD Date *" type="date" InputLabelProps={{ shrink: true }}
                  {...register('chequeDate', { required: 'Required' })}
                  error={!!errors.chequeDate} helperText={errors.chequeDate?.message} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Bank Name *" {...register('bankName', { required: 'Required' })}
                  error={!!errors.bankName} helperText={errors.bankName?.message} />
              </Grid>
            </>
          )}
          {showOnline && (
            <>
              <Grid item xs={12} md={4}>
                <TextField label="Transaction Number *" {...register('transactionNumber', { required: 'Required' })}
                  error={!!errors.transactionNumber} helperText={errors.transactionNumber?.message} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Transaction Date *" type="date" InputLabelProps={{ shrink: true }}
                  {...register('transactionDate', { required: 'Required' })}
                  error={!!errors.transactionDate} helperText={errors.transactionDate?.message} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Bank Name *" {...register('bankName', { required: 'Required' })}
                  error={!!errors.bankName} helperText={errors.bankName?.message} />
              </Grid>
            </>
          )}
        </Grid>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
          <Button onClick={() => nav('/receipts')}>Cancel</Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting || save.isPending}>
            {isEdit ? 'Update Receipt' : 'Issue Receipt'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
