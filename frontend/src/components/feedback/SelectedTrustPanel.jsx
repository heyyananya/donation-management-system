import { Paper, Box, Avatar, Typography, Stack } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Read-only summary of the currently selected trust. Mirrors what will be
 * printed at the top of the Receipt and Thanks Letter so the user can spot a
 * wrong-trust selection before issuing a receipt. All data comes from the
 * Trust Master record and is never editable from this surface.
 */
export default function SelectedTrustPanel({ trust }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: 3,
        background:
          'linear-gradient(180deg, rgba(15,118,110,0.04) 0%, rgba(20,184,166,0.02) 100%)',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 0.6 }}>
        Selected Trust Information
      </Typography>

      <AnimatePresence mode="wait">
        {!trust ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Box sx={{ py: 2.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Please select a Trust.
              </Typography>
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key={trust.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <Stack alignItems="center" spacing={1.5} sx={{ mt: 1 }}>
              <Avatar
                variant="rounded"
                src={trust.logoFileName ? `/api/files/trust-logos/${trust.logoFileName}` : ''}
                sx={{
                  width: 72, height: 72,
                  border: '1px solid #E2E8F0',
                  bgcolor: '#F1F5F9',
                  fontSize: 28,
                }}
              >
                {(trust.name || '').slice(0, 1) || 'T'}
              </Avatar>
              <Typography
                variant="h6"
                align="center"
                sx={{ fontWeight: 700, letterSpacing: 0.4 }}
              >
                {trust.name || ''}
              </Typography>
              {trust.correspondenceAddress ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    px: 1.5,
                    py: 1.5,
                    width: '100%',
                    maxWidth: 640,
                    background: '#fff',
                    border: '1px dashed #CBD5E1',
                    borderRadius: 2,
                    fontFamily:
                      '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'text.primary',
                    whiteSpace: 'pre-line',
                    textAlign: 'center',
                    overflowX: 'auto',
                  }}
                >
                  {trust.correspondenceAddress}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  This trust has no Correspondence Address yet. Add it under Trust Master.
                </Typography>
              )}
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>
    </Paper>
  );
}
