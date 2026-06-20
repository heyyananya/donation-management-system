import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, IconButton, Stack, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import DataTable from '../../components/table/DataTable.jsx';
import ConfirmDialog from '../../components/feedback/ConfirmDialog.jsx';
import { remarkApi } from '../../api/remark.api.js';

export default function RemarkListPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ['remarks'], queryFn: remarkApi.list });
  const [editing, setEditing] = useState(null); // null | {} for new | row for edit
  const [toDelete, setToDelete] = useState(null);

  const del = useMutation({
    mutationFn: (id) => remarkApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remarks'] }); toast.success('Remark deleted'); setToDelete(null); },
  });

  const columns = [
    { id: 'name', label: 'Remark' },
    {
      id: '_actions', label: 'Actions', sortable: false, align: 'right',
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end">
          <Tooltip title="Edit"><IconButton size="small" onClick={() => setEditing(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setToDelete(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Remark Master"
        subtitle="Predefined donation purposes shown in the Receipt form."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>Add Remark</Button>}
      />
      <DataTable rows={rows} columns={columns} searchKeys={['name']} />
      <RemarkDialog open={!!editing} initial={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Remark"
        message={`Delete "${toDelete?.name}"? Remarks in use cannot be deleted.`}
        confirmText="Delete"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => del.mutate(toDelete.id)}
      />
    </Box>
  );
}

function RemarkDialog({ open, initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '' } });

  // Reset whenever dialog opens with a new value.
  useEffect(() => { if (open) reset({ name: initial?.name || '' }); }, [open, initial, reset]);

  const save = useMutation({
    mutationFn: (data) => (isEdit ? remarkApi.update(initial.id, data) : remarkApi.create(data)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remarks'] }); toast.success(`Remark ${isEdit ? 'updated' : 'created'}`); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Remark' : 'New Remark'}</DialogTitle>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <DialogContent>
          <TextField
            label="Remark Name *"
            autoFocus
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register('name', { required: 'Required' })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || save.isPending}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
