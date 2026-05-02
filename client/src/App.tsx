// src/App.tsx
'use client';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SonnerToaster } from '@/components/ui/sonner';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';

// Public Pages
import Login from './pages/login';
import Register from './pages/registration';
import ForgotPassword from './pages/forgotPassword';
import ResetMethodSelection from './pages/resetMethodSelection';
import VerifyResetOTP from './pages/verifyResetOTP';
import ResetPassword from './pages/resetPassword';
import SetupMFA from './pages/mfa/SetupMFA';

// Route Components
import PublicRoute from './components/routes/publicRoute';
import PrivateRoute from './components/routes/privateRoute';
import PermissionRoute from './components/routes/permissionRoute';
import VerifyOtpRoute from './components/routes/verifyOTPRoute';
import LandingRedirect from './components/routes/LandingRedirect';

// Private Pages (inside ProtectedLayout)
import Dashboard from './pages/dashboard/dashboard';
import ProfilePage from './pages/profile/profilePage';
import Users from './pages/user';
import Settings from './pages/settings/settings';
import Assets from './pages/assets/assets-list/assets';
import AssetsAssignment from './pages/assets/asset-issuance/assetsIssuance';
import AssetsTransfer from './pages/assets/assetsTransfer';
import AssetsMaintenance from './pages/assets/assetsMaintenance';
import AssetsRepair from './pages/assets/assetsRepair';
import AssetsReturn from './pages/assets/assetsReturn';
import Assetsdisposal from './pages/assets/assetsDisposal';
import AssetTagging from './pages/assets/asset-tagging/assetTagging';
import AssetDetails from './pages/assets/assetDetails';
import MyAssets from './pages/assets/myAssets';
import AssetBuilder from './pages/assets/assetBuilder';
import AssetDepartment from './pages/assets/assetRequest';
import AssetRequestAdmin from './pages/assets/admin/assetRequestAdmin';
import AssetBorrowing from './pages/assets/assetBorrowing';
import BorrowRequestsPage from './pages/assets/borrowRequestsPage';
import AssetReturnRequest from './pages/assets/assetReturnRequest';
import MyReturnRequestsPage from './pages/assets/myReturnRequestsPage';
import ReturnRequestsPage from './pages/assets/returnRequestsPage';
import AssetTransferRequest from './pages/assets/assetTransferRequest';
import TransferRequestsPage from './pages/assets/transferRequestsPage';
import MyTransferRequestsPage from './pages/assets/myTransferRequestsPage';
import AssetsAssignmentHistory from './pages/assets-history/assetsIssuanceHistroy';
import AssetsTransferHistory from './pages/assets-history/assetsTransferHistory';
import AssetsMaintenanceHistory from './pages/assets-history/assetsMaintenanceHistory';
import AssetsRepairHistory from './pages/assets-history/assetsRepairHistory';
import AssetsReturnHistory from './pages/assets-history/assetsReturnHistory';
import AssetsDisposalHistory from './pages/assets-history/assetsDisposalHistory';
import AuditTrail from './pages/assets-history/auditTrail';
import UserManual from './pages/userManual';
import FlowDiagrams from './pages/flowDiagrams';
import AccountabilityFormsPage from './pages/forms/AccountabilityFormsPage';
import BorrowFormsPage from './pages/forms/BorrowFormsPage';
import AssetReturnFormsPage from './pages/forms/AssetReturnFormsPage';
import AssetTransferFormsPage from './pages/forms/AssetTransferFormsPage';
import ApprovalsPage from './pages/approvals/ApprovalsPage';
import ReportsPage from './pages/reports/reportsPage';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-method-selection"
            element={
              <PublicRoute>
                <ResetMethodSelection />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-reset-otp"
            element={
              <PublicRoute>
                <VerifyResetOTP />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/assets/details/:assetId"
            element={
              <PublicRoute>
                <AssetDetails />
              </PublicRoute>
            }
          />

          {/* Semi-Protected: Only after registration */}
          <Route path="/verify-otp" element={<VerifyOtpRoute />} />

          {/* MFA Routes */}
          {/* /verify-mfa is now handled inline in Login - redirect for backward compatibility */}
          <Route path="/verify-mfa" element={<Navigate to="/login" replace />} />
          <Route
            path="/mfa/setup"
            element={
              <PrivateRoute>
                <SetupMFA />
              </PrivateRoute>
            }
          />

          {/* Private Routes (with layout) */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <PermissionRoute module="Dashboard">
                  <Dashboard />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/user"
            element={
              <PrivateRoute>
                <PermissionRoute module="Users">
                  <Users />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <PermissionRoute module="Reports">
                  <ReportsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <PermissionRoute module="Settings">
                  <Settings />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* Assets Routes */}
          <Route
            path="/my-assets"
            element={
              <PrivateRoute>
                <PermissionRoute module="My Assets">
                  <MyAssets />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset List">
                  <Assets />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/assignment"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Assignment">
                  <AssetsAssignment />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/transfer"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Transfer">
                  <AssetsTransfer />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/maintenance"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Maintenance">
                  <AssetsMaintenance />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/repair"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Repair">
                  <AssetsRepair />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/return"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Return">
                  <AssetsReturn />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/return-requests"
            element={
              <PrivateRoute>
                <PermissionRoute module="Return Request">
                  <ReturnRequestsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/return-request/my-requests"
            element={
              <PrivateRoute>
                <PermissionRoute module="Return Request">
                  <MyReturnRequestsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/return-request"
            element={
              <PrivateRoute>
                <PermissionRoute module="Return Request">
                  <AssetReturnRequest />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/request"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Request">
                  <AssetDepartment />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/request-admin"
            element={
              <PrivateRoute>
                <PermissionRoute module="Request Management">
                  <AssetRequestAdmin />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/borrow"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Borrowing">
                  <AssetBorrowing />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/borrow-requests"
            element={
              <PrivateRoute>
                <PermissionRoute module="Borrow Request Management">
                  <BorrowRequestsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/transfer-request/my-requests"
            element={
              <PrivateRoute>
                <PermissionRoute module="Transfer Request">
                  <MyTransferRequestsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/transfer-requests"
            element={
              <PrivateRoute>
                <PermissionRoute module="Transfer Request">
                  <TransferRequestsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/transfer-request"
            element={
              <PrivateRoute>
                <PermissionRoute module="Transfer Request">
                  <AssetTransferRequest />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/disposal"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Disposal">
                  <Assetsdisposal />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/tagging"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset Tagging">
                  <AssetTagging />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/assets/builder"
            element={
              <PrivateRoute>
                <PermissionRoute module="Asset List">
                  <AssetBuilder />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          {/* History Routes */}
          <Route
            path="/history/assignment"
            element={
              <PrivateRoute>
                <PermissionRoute module="Assignment History">
                  <AssetsAssignmentHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/history/transfer"
            element={
              <PrivateRoute>
                <PermissionRoute module="Transfer History">
                  <AssetsTransferHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/history/maintenance"
            element={
              <PrivateRoute>
                <PermissionRoute module="Maintenance History">
                  <AssetsMaintenanceHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/history/repair"
            element={
              <PrivateRoute>
                <PermissionRoute module="Repair History">
                  <AssetsRepairHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/history/return"
            element={
              <PrivateRoute>
                <PermissionRoute module="Return History">
                  <AssetsReturnHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/history/disposal"
            element={
              <PrivateRoute>
                <PermissionRoute module="Disposal History">
                  <AssetsDisposalHistory />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <PrivateRoute>
                <PermissionRoute module="Audit Trail">
                  <AuditTrail />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/forms/accountability"
            element={
              <PrivateRoute>
                <PermissionRoute module="Accountability Form">
                  <AccountabilityFormsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/borrow"
            element={
              <PrivateRoute>
                <PermissionRoute module="Borrow Form">
                  <BorrowFormsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/return"
            element={
              <PrivateRoute>
                <PermissionRoute module="Return Form">
                  <AssetReturnFormsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/forms/transfer"
            element={
              <PrivateRoute>
                <PermissionRoute module="Transfer Form">
                  <AssetTransferFormsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <PrivateRoute>
                <PermissionRoute module="Approvals">
                  <ApprovalsPage />
                </PermissionRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/user-manual"
            element={
              <PrivateRoute>
                <UserManual />
              </PrivateRoute>
            }
          />
          <Route
            path="/flow-diagrams"
            element={
              <PrivateRoute>
                <FlowDiagrams />
              </PrivateRoute>
            }
          />

          {/* Default Redirects */}
          <Route path="/" element={<LandingRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        <SonnerToaster />
      </BrowserRouter>
    </NotificationProvider>
    </AuthProvider>
  );
}
