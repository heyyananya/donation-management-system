import { NavLink } from 'react-router-dom';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/SpaceDashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LabelIcon from '@mui/icons-material/Label';
import DateRangeIcon from '@mui/icons-material/DateRange';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { motion } from 'framer-motion';

const items = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/receipts', label: 'Donation Receipt', icon: <ReceiptLongIcon /> },
  { to: '/donors', label: 'Donor Master', icon: <PeopleIcon /> },
  { to: '/trusts', label: 'Trust Master', icon: <AccountBalanceIcon /> },
  { to: '/remarks', label: 'Remark Master', icon: <LabelIcon /> },
  { to: '/years', label: 'Year Master', icon: <DateRangeIcon /> },
];

export const SIDEBAR_WIDTH = 244;

function SidebarContent({ onItemClick }) {
  return (
    <>
      <Toolbar sx={{ gap: 1.2, px: 2.5 }}>
        <Box sx={{ bgcolor: 'primary.main', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
          <VolunteerActivismIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>Donations</Typography>
          <Typography variant="caption" color="text.secondary">Management Suite</Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1.5, pt: 1 }}>
        {items.map((it, i) => (
          <motion.div
            key={it.to}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            <ListItemButton
              component={NavLink}
              to={it.to}
              end={it.to === '/'}
              onClick={onItemClick}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: 'text.primary',
                '&.active': {
                  background: 'rgba(15, 118, 110, 0.10)',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  fontWeight: 700,
                },
                '&:hover': { background: 'rgba(15, 118, 110, 0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{it.icon}</ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 14.5, fontWeight: 600 }}>{it.label}</ListItemText>
            </ListItemButton>
          </motion.div>
        ))}
      </List>
    </>
  );
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const drawerSx = {
    width: SIDEBAR_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, borderRight: '1px solid #E2E8F0', background: '#fff' },
  };
  return (
    <>
      {/* Mobile: temporary drawer (hamburger toggled). */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}
      >
        <SidebarContent onItemClick={onClose} />
      </Drawer>
      {/* Desktop: permanent drawer. */}
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }}
        open
      >
        <SidebarContent />
      </Drawer>
    </>
  );
}
