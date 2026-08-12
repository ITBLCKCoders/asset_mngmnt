// src/App.tsx
'use client';

import { ComponentType, LazyExoticComponent, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
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
import PublicUserManual from './components/routes/PublicUserManual';

// Lazy private pages
const SetupMFA = lazy(() => import('./pages/mfa/SetupMFA'));
const Dashboard = lazy(() => import('./pages/dashboard/dashboard'));
const ProfilePage = lazy(() => import('./pages/profile/profilePage'));
const Users = lazy(() => import('./pages/user'));
const Settings = lazy(() => import('./pages/settings/settings'));
const Assets = lazy(() => import('./pages/assets/assets-list/assets'));
const AssetsAssignment = lazy(() => import('./pages/assets/asset-issuance/assetsIssuance'));
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
const AssetRequestAdmin = lazy(() => import('./pages/assets/admin/assetRequestAdmin'));
const AssetBorrowing = lazy(() => import('./pages/assets/assetBorrowing'));
const BorrowRequestsPage = lazy(() => import('./pages/assets/borrowRequestsPage'));
const AssetReturnRequest = lazy(() => import('./pages/assets/assetReturnRequest'));
const ReturnRequestsPage = lazy(() => import('./pages/assets/returnRequestsPage'));
const AssetTransferRequest = lazy(() => import('./pages/assets/assetTransferRequest'));
const GatePass = lazy(() => import('./pages/assets/gatePass'));
const TransferRequestsPage = lazy(() => import('./pages/assets/transferRequestsPage'));
const AuditTrail = lazy(() => import('./pages/assets-history/auditTrail'));
const UserManual = lazy(() => import('./pages/userManual'));
const FlowDiagrams = lazy(() => import('./pages/flowDiagrams'));
const AccountabilityFormsPage = lazy(() => import('./pages/forms/AccountabilityFormsPage'));
const BorrowFormsPage = lazy(() => import('./pages/forms/BorrowFormsPage'));
const AssetChecklistFormsPage = lazy(() => import('./pages/forms/AssetChecklistFormsPage'));
const AssetReturnFormsPage = lazy(() => import('./pages/forms/AssetReturnFormsPage'));
const AssetTransferFormsPage = lazy(() => import('./pages/forms/AssetTransferFormsPage'));
const ApprovalsPage = lazy(() => import('./pages/approvals/ApprovalsPage'));
const ReportsPage = lazy(() => import('./pages/reports/reportsPage'));

interface RouteConfig {
  path: string;
  module: string;
  component: LazyExoticComponent<ComponentType<any>>;
}

const privateRoutes: RouteConfig[] = [
  { path: '/mfa/setup',              module: 'MFA',              component: SetupMFA },
  { path: '/dashboard',              module: 'Dashboard',        component: Dashboard },
  { path: '/profile',                module: 'Profile',          component: ProfilePage },
  { path: '/user',                   module: 'Users',            component: Users },
  { path: '/reports',                module: 'Reports',          component: ReportsPage },
  { path: '/settings',               module: 'Settings',         component: Settings },
  { path: '/my-assets',              module: 'My Assets',        component: MyAssets },
  { path: '/assets',                 module: 'Asset List',       component: Assets },
  { path: '/assets/assignment',      module: 'Asset Assignment', component: AssetsAssignment },
  { path: '/assets/transfer',        module: 'Asset Transfer',   component: AssetsTransfer },
  { path: '/assets/maintenance',     module: 'Asset Maintenance',component: AssetsMaintenance },
  { path: '/assets/repair',          module: 'Asset Repair',     component: AssetsRepair },
  { path: '/assets/return',          module: 'Asset Return',     component: AssetsReturn },
  { path: '/assets/return-requests', module: 'Return Request',   component: ReturnRequestsPage },
  { path: '/assets/return-request',  module: 'Return Request',   component: AssetReturnRequest },
  { path: '/assets/request',         module: 'Asset Request',    component: AssetDepartment },
  { path: '/assets/request-admin',   module: 'Request Management',component: AssetRequestAdmin },
  { path: '/assets/borrow',          module: 'Asset Borrowing',  component: AssetBorrowing },
  { path: '/assets/borrow-requests', module: 'Borrow Request Management', component: BorrowRequestsPage },
  { path: '/assets/transfer-requests', module: 'Transfer Request', component: TransferRequestsPage },
  { path: '/assets/transfer-request', module: 'Transfer Request', component: AssetTransferRequest },
  { path: '/assets/disposal',        module: 'Asset Disposal',   component: Assetsdisposal },
  { path: '/assets/gate-pass',       module: 'Gate Pass',        component: GatePass },
  { path: '/assets/tagging',         module: 'Asset Tagging',    component: AssetTagging },
  { path: '/assets/builder',         module: 'Asset List',       component: AssetBuilder },
  { path: '/audit',                  module: 'Audit Trail',      component: AuditTrail },
  { path: '/forms/accountability',   module: 'Accountability Form', component: AccountabilityFormsPage },
  { path: '/forms/borrow',           module: 'Borrow Form',      component: BorrowFormsPage },
  { path: '/forms/checklist',        module: 'Checklist Form',   component: AssetChecklistFormsPage },
  { path: '/forms/return',           module: 'Return Form',      component: AssetReturnFormsPage },
  { path: '/forms/transfer',         module: 'Transfer Form',    component: AssetTransferFormsPage },
  { path: '/approvals',              module: 'Approvals',        component: ApprovalsPage },
  { path: '/user-manual',            module: 'UserManual',       component: UserManual },
  { path: '/flow-diagrams',          module: 'FlowDiagrams',     component: FlowDiagrams },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <PermissionsProvider>
            <BrowserRouter unstable_useTransitions={false}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-method-selection" element={<PublicRoute><ResetMethodSelection /></PublicRoute>} />
              <Route path="/verify-reset-otp" element={<PublicRoute><VerifyResetOTP /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/assets/details/:assetId" element={<PublicRoute><AssetDetails /></PublicRoute>} />
              <Route path="/public/manual" element={<PublicUserManual />} />

              <Route path="/verify-otp" element={<VerifyOtpRoute />} />
              <Route path="/verify-mfa" element={<Navigate to="/login" replace />} />

              {/* Authenticated routes — layout persists across navigation */}
              <Route element={<PrivateRoute />}>
                <Route element={<ProtectedLayout />}>
                  {privateRoutes.map(({ path, module, component: Component }) => (
                    <Route
                      key={path}
                      path={path}
                      element={
                        <PermissionRoute module={module}>
                          <Component />
                        </PermissionRoute>
                      }
                    />
                  ))}
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
    </QueryClientProvider>
  );
}
