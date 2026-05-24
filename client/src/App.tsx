// src/App.tsx
'use client';

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SonnerToaster } from '@/components/ui/sonner';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';
import { PermissionsProvider } from '@/context/PermissionsContext';

// Public Pages (eager — first paint)
import Login from './pages/login';
import Register from './pages/registration';
import ForgotPassword from './pages/forgotPassword';
import ResetMethodSelection from './pages/resetMethodSelection';
import VerifyResetOTP from './pages/verifyResetOTP';
import ResetPassword from './pages/resetPassword';

// Route Components
import PublicRoute from './components/routes/publicRoute';
import PrivateRoute from './components/routes/privateRoute';
import ProtectedLayout from './components/routes/protectedLayout';
import PermissionRoute from './components/routes/permissionRoute';
import VerifyOtpRoute from './components/routes/verifyOTPRoute';
import LandingRedirect from './components/routes/LandingRedirect';
import { RouteContentFallback } from '@/components/common/pageSkeletons';

// Lazy private pages
const SetupMFA = lazy(() => import('./pages/mfa/SetupMFA'));
const Dashboard = lazy(() => import('./pages/dashboard/dashboard'));
const ProfilePage = lazy(() => import('./pages/profile/profilePage'));
const Users = lazy(() => import('./pages/user'));
const Settings = lazy(() => import('./pages/settings/settings'));
const Assets = lazy(() => import('./pages/assets/assets-list/assets'));
const AssetsAssignment = lazy(
  () => import('./pages/assets/asset-issuance/assetsIssuance')
);
const AssetsTransfer = lazy(() => import('./pages/assets/assetsTransfer'));
const AssetsMaintenance = lazy(() => import('./pages/assets/assetsMaintenance'));
const AssetsRepair = lazy(() => import('./pages/assets/assetsRepair'));
const AssetsReturn = lazy(() => import('./pages/assets/assetsReturn'));
const Assetsdisposal = lazy(() => import('./pages/assets/assetsDisposal'));
const AssetTagging = lazy(() => import('./pages/assets/asset-tagging/assetTagging'));
const AssetDetails = lazy(() => import('./pages/assets/assetDetails'));
const MyAssets = lazy(() => import('./pages/assets/myAssets'));
const AssetBuilder = lazy(() => import('./pages/assets/assetBuilder'));
const AssetDepartment = lazy(() => import('./pages/assets/assetRequest'));
const AssetRequestAdmin = lazy(
  () => import('./pages/assets/admin/assetRequestAdmin')
);
const AssetBorrowing = lazy(() => import('./pages/assets/assetBorrowing'));
const BorrowRequestsPage = lazy(
  () => import('./pages/assets/borrowRequestsPage')
);
const AssetReturnRequest = lazy(
  () => import('./pages/assets/assetReturnRequest')
);
const ReturnRequestsPage = lazy(
  () => import('./pages/assets/returnRequestsPage')
);
const AssetTransferRequest = lazy(
  () => import('./pages/assets/assetTransferRequest')
);
const GatePass = lazy(() => import('./pages/assets/gatePass'));
const TransferRequestsPage = lazy(
  () => import('./pages/assets/transferRequestsPage')
);
const AssetsAssignmentHistory = lazy(
  () => import('./pages/assets-history/assetsIssuanceHistroy')
);
const AssetsTransferHistory = lazy(
  () => import('./pages/assets-history/assetsTransferHistory')
);
const AssetsMaintenanceHistory = lazy(
  () => import('./pages/assets-history/assetsMaintenanceHistory')
);
const AssetsRepairHistory = lazy(
  () => import('./pages/assets-history/assetsRepairHistory')
);
const AssetsReturnHistory = lazy(
  () => import('./pages/assets-history/assetsReturnHistory')
);
const AssetsDisposalHistory = lazy(
  () => import('./pages/assets-history/assetsDisposalHistory')
);
const AuditTrail = lazy(() => import('./pages/assets-history/auditTrail'));
const UserManual = lazy(() => import('./pages/userManual'));
const FlowDiagrams = lazy(() => import('./pages/flowDiagrams'));
const AccountabilityFormsPage = lazy(
  () => import('./pages/forms/AccountabilityFormsPage')
);
const BorrowFormsPage = lazy(() => import('./pages/forms/BorrowFormsPage'));
const AssetChecklistFormsPage = lazy(
  () => import('./pages/forms/AssetChecklistFormsPage')
);
const AssetReturnFormsPage = lazy(
  () => import('./pages/forms/AssetReturnFormsPage')
);
const AssetTransferFormsPage = lazy(
  () => import('./pages/forms/AssetTransferFormsPage')
);
const ApprovalsPage = lazy(() => import('./pages/approvals/ApprovalsPage'));
const ReportsPage = lazy(() => import('./pages/reports/reportsPage'));

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <PermissionsProvider>
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
                    <Suspense fallback={<RouteContentFallback />}>
                      <AssetDetails />
                    </Suspense>
                  </PublicRoute>
                }
              />

              <Route path="/verify-otp" element={<VerifyOtpRoute />} />
              <Route
                path="/verify-mfa"
                element={<Navigate to="/login" replace />}
              />

              {/* Authenticated routes — layout persists across navigation */}
              <Route element={<PrivateRoute />}>
                <Route element={<ProtectedLayout />}>
                  <Route path="/mfa/setup" element={<SetupMFA />} />
                  <Route
                    path="/dashboard"
                    element={
                      <PermissionRoute module="Dashboard">
                        <Dashboard />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route
                    path="/user"
                    element={
                      <PermissionRoute module="Users">
                        <Users />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PermissionRoute module="Reports">
                        <ReportsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PermissionRoute module="Settings">
                        <Settings />
                      </PermissionRoute>
                    }
                  />

                  <Route
                    path="/my-assets"
                    element={
                      <PermissionRoute module="My Assets">
                        <MyAssets />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets"
                    element={
                      <PermissionRoute module="Asset List">
                        <Assets />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/assignment"
                    element={
                      <PermissionRoute module="Asset Assignment">
                        <AssetsAssignment />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/transfer"
                    element={
                      <PermissionRoute module="Asset Transfer">
                        <AssetsTransfer />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/maintenance"
                    element={
                      <PermissionRoute module="Asset Maintenance">
                        <AssetsMaintenance />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/repair"
                    element={
                      <PermissionRoute module="Asset Repair">
                        <AssetsRepair />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/return"
                    element={
                      <PermissionRoute module="Asset Return">
                        <AssetsReturn />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/return-requests"
                    element={
                      <PermissionRoute module="Return Request">
                        <ReturnRequestsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/return-request"
                    element={
                      <PermissionRoute module="Return Request">
                        <AssetReturnRequest />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/request"
                    element={
                      <PermissionRoute module="Asset Request">
                        <AssetDepartment />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/request-admin"
                    element={
                      <PermissionRoute module="Request Management">
                        <AssetRequestAdmin />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/borrow"
                    element={
                      <PermissionRoute module="Asset Borrowing">
                        <AssetBorrowing />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/borrow-requests"
                    element={
                      <PermissionRoute module="Borrow Request Management">
                        <BorrowRequestsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/transfer-requests"
                    element={
                      <PermissionRoute module="Transfer Request">
                        <TransferRequestsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/transfer-request"
                    element={
                      <PermissionRoute module="Transfer Request">
                        <AssetTransferRequest />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/disposal"
                    element={
                      <PermissionRoute module="Asset Disposal">
                        <Assetsdisposal />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/gate-pass"
                    element={
                      <PermissionRoute module="Gate Pass">
                        <GatePass />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/tagging"
                    element={
                      <PermissionRoute module="Asset Tagging">
                        <AssetTagging />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/assets/builder"
                    element={
                      <PermissionRoute module="Asset List">
                        <AssetBuilder />
                      </PermissionRoute>
                    }
                  />

                  <Route
                    path="/history/assignment"
                    element={
                      <PermissionRoute module="Assignment History">
                        <AssetsAssignmentHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/history/transfer"
                    element={
                      <PermissionRoute module="Transfer History">
                        <AssetsTransferHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/history/maintenance"
                    element={
                      <PermissionRoute module="Maintenance History">
                        <AssetsMaintenanceHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/history/repair"
                    element={
                      <PermissionRoute module="Repair History">
                        <AssetsRepairHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/history/return"
                    element={
                      <PermissionRoute module="Return History">
                        <AssetsReturnHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/history/disposal"
                    element={
                      <PermissionRoute module="Disposal History">
                        <AssetsDisposalHistory />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/audit"
                    element={
                      <PermissionRoute module="Audit Trail">
                        <AuditTrail />
                      </PermissionRoute>
                    }
                  />

                  <Route
                    path="/forms/accountability"
                    element={
                      <PermissionRoute module="Accountability Form">
                        <AccountabilityFormsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/forms/borrow"
                    element={
                      <PermissionRoute module="Borrow Form">
                        <BorrowFormsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/forms/checklist"
                    element={
                      <PermissionRoute module="Checklist Form">
                        <AssetChecklistFormsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/forms/return"
                    element={
                      <PermissionRoute module="Return Form">
                        <AssetReturnFormsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/forms/transfer"
                    element={
                      <PermissionRoute module="Transfer Form">
                        <AssetTransferFormsPage />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/approvals"
                    element={
                      <PermissionRoute module="Approvals">
                        <ApprovalsPage />
                      </PermissionRoute>
                    }
                  />

                  <Route path="/user-manual" element={<UserManual />} />
                  <Route path="/flow-diagrams" element={<FlowDiagrams />} />
                </Route>
              </Route>

              <Route path="/" element={<LandingRedirect />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            <SonnerToaster />
          </BrowserRouter>
        </PermissionsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
