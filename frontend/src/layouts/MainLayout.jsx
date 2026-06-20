import { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainLayout() {
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          // Avoid horizontal overflow that would let tables push the layout
          // wider than the viewport on small screens.
          minWidth: 0,
          width: { xs: '100%', md: 'auto' },
        }}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ p: { xs: 1.5, sm: 2, md: 3 }, flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
}
