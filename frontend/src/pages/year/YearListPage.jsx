import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, IconButton, Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Switch, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { yearApi } from '../../api/year.api.js';

export default function YearListPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ['years'], queryFn: yearApi.list });
  const [editing, setEditing] = useState(null); // null | {} for new | row for edit
  const [toDelete, setToDelete] = useState(null);

  const del = useMutation({
    mutationFn: (id) => yearApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] });
      toast.success('Financial Year deleted');
      setToDelete(null);
    },
  });

  const columns = [
    { id: 'name', label: 'Financial Year', render: (r) => <Box sx={{ fontWeight: 700 }}>{r.name}</Box> },
    { id: 'startDate', label: 'Start Date' },
    { id: 'endDate', label: 'End Date' },
    {
      id: 'isActive',
      label: 'Status',
      render: (r) => (
        <Chip
          size="small"
          label={r.isActive ? 'Active' : 'Inactive'}
          color={r.isActive ? 'success' : 'default'}
          variant={r.isActive ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      id: '_actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditing(r)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setToDelete(r)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Year Master"
        subtitle="Financial years available across donation receipts. Only active years accept new receipts."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>
            Add Year
          </Button>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        searchKeys={['name', 'startDate', 'endDate']}
        emptyMessage={isLoading ? 'Loading…' : 'No financial years yet'}
      />
      <YearDialog open={!!editing} initial={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Financial Year"
        message={`Delete "${toDelete?.name}"? Years with receipts linked cannot be deleted.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
    </Box>
  );
}

function defaultDatesForName(name) {
  if (!/^\d{4}-\d{2}$/.test(name || '')) return { startDate: '', endDate: '' };
  const start = Number(name.split('-')[0]);
  return { startDate: `${start}-04-01`, endDate: `${start + 1}-03-31` };
}

function YearDialog({ open, initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const {
    register, handleSubmit, control, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', startDate: '', endDate: '', isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: initial?.name || '',
      startDate: initial?.startDate || '',
      endDate: initial?.endDate || '',
      isActive: initial?.isActive === undefined ? true : !!initial.isActive,
    });
  }, [open, initial, reset]);

  // Auto-fill start/end dates when the user types a valid name and the date
  // fields are blank — saves typing for the common case.
  const watchedName = watch('name');
  const watchedStart = watch('startDate');
  const watchedEnd = watch('endDate');
  useEffect(() => {
    if (isEdit) return;
    if (watchedStart || watchedEnd) return;
    const { startDate, endDate } = defaultDatesForName(watchedName);
    if (startDate && endDate) {
      setValue('startDate', startDate);
      setValue('endDate', endDate);
    }
  }, [watchedName, watchedStart, watchedEnd, isEdit, setValue]);

  const save = useMutation({
    mutationFn: (data) => (isEdit ? yearApi.update(initial.id, data) : yearApi.create(data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] });
      toast.success(`Financial Year ${isEdit ? 'updated' : 'created'}`);
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Financial Year' : 'New Financial Year'}</DialogTitle>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Financial Year * (YYYY-YY)"
              placeholder="2025-26"
              autoFocus={!isEdit}
              error={!!errors.name}
              helperText={errors.name?.message || 'Indian FY format, e.g. 2025-26'}
              {...register('name', {
                required: 'Required',
                pattern: { value: /^\d{4}-\d{2}$/, message: 'Use YYYY-YY format' },
              })}
            />
            <TextField
              label="Start Date *"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!errors.startDate}
              helperText={errors.startDate?.message}
              {...register('startDate', { required: 'Required' })}
            />
            <TextField
              label="End Date *"
              type="date"
              InputLabelProps={{ shrink: true }}
              error={!!errors.endDate}
              helperText={errors.endDate?.message || 'Must be after Start Date'}
              {...register('endDate', {
                required: 'Required',
                validate: (v) => (v > watchedStart) || 'Must be after Start Date',
              })}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={field.value ? 'Active (accepts new receipts)' : 'Inactive (read-only)'}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || save.isPending}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
