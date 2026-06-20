import { useQuery } from '@tanstack/react-query';
import { Grid, Paper, Stack, Typography, Box, Skeleton, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PageHeader from '../../components/feedback/PageHeader.jsx';
import { dashboardApi } from '../../api/dashboard.api.js';

const cards = [
  { id: 'donors', label: 'Total Donors', icon: <PeopleIcon />, color: '#0F766E' },
  { id: 'trusts', label: 'Total Trusts', icon: <AccountBalanceIcon />, color: '#14B8A6' },
  { id: 'receipts', label: 'Total Receipts', icon: <ReceiptLongIcon />, color: '#0EA5A4' },
  { id: 'donations', label: 'Total Donations', icon: <VolunteerActivismIcon />, color: '#0B5751', currency: true },
];

function formatINR(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary });
  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="At-a-glance snapshot of donations across all trusts." />
      <Grid container spacing={2.5}>
        {cards.map((c, i) => (
          <Grid key={c.id} item xs={12} sm={6} md={3}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }} whileHover={{ y: -3 }}>
              <Paper sx={{ p: 2.5, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    {isLoading ? (
                      <Skeleton width={80} height={36} />
                    ) : (
                      <Typography variant="h4" sx={{ mt: 0.5 }}>
                        {c.currency ? formatINR(data?.totals?.[c.id]) : (data?.totals?.[c.id] ?? 0)}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: `${c.color}1A`, color: c.color }}>
                    {c.icon}
                  </Box>
                </Stack>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 1 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Receipts</Typography>
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} height={36} />)
            ) : (data?.recentReceipts?.length ? data.recentReceipts.map((r) => (
              <Stack key={r.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.donorName} <Chip size="small" label={r.financialYear} sx={{ ml: 1 }} /></Typography>
                  <Typography variant="caption" color="text.secondary">#{r.number} · {r.trustName} · {r.date}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(r.amount)}</Typography>
              </Stack>
            )) : <Typography color="text.secondary" variant="body2">No receipts yet.</Typography>)}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Donors</Typography>
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} height={36} />)
            ) : (data?.recentDonors?.length ? data.recentDonors.map((d) => (
              <Stack key={d.id} direction="row" justifyContent="space-between" sx={{ py: 1, borderBottom: '1px solid #F1F5F9' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{d.mobile} {d.pan ? `· ${d.pan}` : ''}</Typography>
                </Box>
              </Stack>
            )) : <Typography color="text.secondary" variant="body2">No donors yet.</Typography>)}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
