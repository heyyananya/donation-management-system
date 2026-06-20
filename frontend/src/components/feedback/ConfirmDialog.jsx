import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

export default function ConfirmDialog({ open, title = 'Confirm', message, onClose, onConfirm, confirmText = 'Confirm', danger = false }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color={danger ? 'error' : 'primary'} variant="contained">{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
