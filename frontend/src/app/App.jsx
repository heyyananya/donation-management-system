import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from '../auth/RequireAuth.jsx';
import LoginPage from '../auth/LoginPage.jsx';
import MainLayout from '../layouts/MainLayout.jsx';

import DashboardPage from '../pages/dashboard/DashboardPage.jsx';
import DonorListPage from '../pages/donor/DonorListPage.jsx';
import DonorFormPage from '../pages/donor/DonorFormPage.jsx';
import TrustListPage from '../pages/trust/TrustListPage.jsx';
import TrustFormPage from '../pages/trust/TrustFormPage.jsx';
import RemarkListPage from '../pages/remark/RemarkListPage.jsx';
import YearListPage from '../pages/year/YearListPage.jsx';
import ReceiptListPage from '../pages/receipt/ReceiptListPage.jsx';
import ReceiptFormPage from '../pages/receipt/ReceiptFormPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="donors" element={<DonorListPage />} />
        <Route path="donors/new" element={<DonorFormPage />} />
        <Route path="donors/:id/edit" element={<DonorFormPage />} />
        <Route path="trusts" element={<TrustListPage />} />
        <Route path="trusts/new" element={<TrustFormPage />} />
        <Route path="trusts/:id/edit" element={<TrustFormPage />} />
        <Route path="remarks" element={<RemarkListPage />} />
        <Route path="years" element={<YearListPage />} />
        <Route path="receipts" element={<ReceiptListPage />} />
        <Route path="receipts/new" element={<ReceiptFormPage />} />
        <Route path="receipts/:id/edit" element={<ReceiptFormPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
