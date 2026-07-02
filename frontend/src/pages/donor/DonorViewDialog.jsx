import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Chip, Box } from '@mui/material';
import { docTypeLabel } from '../../constants/donorDocTypes.js';
import { downloadDonorDoc } from '../../utils/downloadDonorDoc.js';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{value}</Typography>
    </Box>
  );
}

export default function DonorViewDialog({ open, donor, onClose }) {
  if (!donor) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{donor.name}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Field label="Mobile" value={donor.mobile} />
          <Field label="PAN" value={donor.pan} />
          <Field label="Aadhaar" value={donor.aadhaar} />
          <Field label="Voter ID" value={donor.voterId} />
          <Field label="Passport" value={donor.passport} />
          <Field label="Address" value={donor.address} />
          {donor.documents?.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">Documents</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {donor.documents.map((d) => (
                  <Chip
                    key={d.id}
                    label={`${docTypeLabel(d.type)} · ${d.originalName}`}
                    title={d.originalName}
                    clickable
                    onClick={() => downloadDonorDoc(d)}
                    sx={{ maxWidth: 320 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
