import { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Box, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../auth/authContext.jsx';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ background: '#fff', color: 'text.primary', borderBottom: '1px solid #E2E8F0' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          aria-label="open navigation"
          onClick={onMenuClick}
          edge="start"
          sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            flexGrow: 1,
            fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            Donation Management System
          </Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            Donations
          </Box>
        </Typography>
        <Box>
          <Tooltip title={user?.username || ''}>
            <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}>
                {(user?.displayName || user?.username || 'A').slice(0, 1).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <MenuItem disabled>{user?.displayName || user?.username}</MenuItem>
            <MenuItem onClick={() => { setAnchor(null); logout(); }}>
              <LogoutIcon fontSize="small" style={{ marginRight: 8 }} /> Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
