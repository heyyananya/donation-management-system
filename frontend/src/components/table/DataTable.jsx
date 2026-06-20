import { useMemo, useState } from 'react';
import {
  Paper, Table, TableHead, TableRow, TableCell, TableBody, TablePagination, TextField,
  Box, InputAdornment, TableSortLabel, Typography, Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { motion, AnimatePresence } from 'framer-motion';

export default function DataTable({
  rows = [],
  columns = [], // { id, label, render?, sortable? = true, width? }
  searchKeys = [],
  emptyMessage = 'No records yet',
  actions, // optional toolbar element
  initialPageSize = 10,
  dense = false,
}) {
  const [q, setQ] = useState('');
  const [orderBy, setOrderBy] = useState(columns[0]?.id || '');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const term = q.toLowerCase();
    return rows.filter((r) =>
      (searchKeys.length ? searchKeys : columns.map((c) => c.id)).some((k) =>
        String(r[k] ?? '').toLowerCase().includes(term)
      )
    );
  }, [rows, q, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!orderBy) return filtered;
    const cmp = (a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    };
    return [...filtered].sort((a, b) => (order === 'asc' ? cmp(a, b) : -cmp(a, b)));
  }, [filtered, orderBy, order]);

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (id) => {
    if (orderBy === id) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(id); setOrder('asc'); }
  };

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ p: 2 }}>
        <TextField
          placeholder="Search…"
          size="small"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          sx={{ maxWidth: 360 }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
        />
        <Box>{actions}</Box>
      </Stack>
      <Box sx={{ overflow: 'auto' }}>
        <Table size={dense ? 'small' : 'medium'} stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id} style={c.width ? { width: c.width } : undefined} align={c.align || 'left'}>
                  {c.sortable === false ? c.label : (
                    <TableSortLabel
                      active={orderBy === c.id}
                      direction={orderBy === c.id ? order : 'asc'}
                      onClick={() => handleSort(c.id)}
                    >
                      {c.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <AnimatePresence initial={false}>
              {paged.map((row, idx) => (
                <motion.tr
                  key={row.id || idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'table-row' }}
                >
                  {columns.map((c) => (
                    <TableCell key={c.id} align={c.align || 'left'}>
                      {c.render ? c.render(row) : row[c.id]}
                    </TableCell>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
            {!paged.length && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">{emptyMessage}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_e, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}
