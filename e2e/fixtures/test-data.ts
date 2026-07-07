export const E2E_TEST_ASSETS = [
  {
    name: 'Dell Latitude 5540 Laptop',
    assetTag: 'E2E-IT-001',
    serialNo: 'E2ESN001',
    status: 'In Use',
  },
  {
    name: 'HP LaserJet Pro Printer',
    assetTag: 'E2E-IT-002',
    serialNo: 'E2ESN002',
    status: 'Available',
  },
  {
    name: 'Cisco Meraki MX64 Firewall',
    assetTag: 'E2E-IT-003',
    serialNo: 'E2ESN003',
    status: 'Under Maintenance',
  },
  {
    name: 'Dell Latitude 5550 Laptop',
    assetTag: 'E2E-IT-004',
    serialNo: 'E2ESN004',
    status: 'Available',
  },
  {
    name: 'HP ProBook 450 Laptop',
    assetTag: 'E2E-IT-005',
    serialNo: 'E2ESN005',
    status: 'Available',
  },
];

export const E2E_FORM_IDS = {
  returnForm: 'e1000000-0000-0000-0000-000000000001',
  returnFormNumber: 'E2E-RF-001',
  transferForm: 'f1000000-0000-0000-0000-000000000001',
  transferFormNumber: 'E2E-TRF-001',
  accountabilityForm: 'g1000000-0000-0000-0000-000000000001',
  accountabilityFormNumber: 'E2E-ACF-001',
  borrowRequest: 'd1000000-0000-0000-0000-000000000001',
  assignment: 'b1000000-0000-0000-0000-000000000001',
  gatePass: 'j1000000-0000-0000-0000-000000000001',
  intangibleAsset: 'k1000000-0000-0000-0000-000000000001',
} as const;

export const E2E_IDS = {
  company: '10000000-0000-0000-0000-000000000001',
  department: '20000000-0000-0000-0000-000000000001',
  location: '70000000-0000-0000-0000-000000000001',
  locationRoom: '70000000-0000-0000-0000-000000000012',
  category: '50000000-0000-0000-0000-000000000001',
  type: '60000000-0000-0000-0000-000000000001',
} as const;

export const E2E_ROUTES = {
  public: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetMethod: '/reset-method-selection',
    verifyResetOtp: '/verify-reset-otp',
    resetPassword: '/reset-password',
  },
  authenticated: {
    dashboard: '/dashboard',
    profile: '/profile',
    myAssets: '/my-assets',
    assets: '/assets',
    mfaSetup: '/mfa/setup',
  },
  permissionGated: {
    users: '/user',
    reports: '/reports',
    settings: '/settings',
    audit: '/audit',
    forms: '/forms',
  },
  assetRoutes: {
    assignment: '/assets/assignment',
    transfer: '/assets/transfer',
    return: '/assets/return',
    borrow: '/assets/borrow',
    maintenance: '/assets/maintenance',
    repair: '/assets/repair',
    disposal: '/assets/disposal',
    gatePass: '/assets/gate-pass',
    tagging: '/assets/tagging',
    request: '/assets/request',
    requestAdmin: '/assets/request-admin',
    borrowRequests: '/assets/borrow-requests',
    returnRequests: '/assets/return-requests',
    transferRequests: '/assets/transfer-requests',
    returnRequest: '/assets/return-request',
    transferRequest: '/assets/transfer-request',
  },
  formRoutes: {
    accountability: '/forms/accountability',
    borrow: '/forms/borrow',
    checklist: '/forms/checklist',
    return: '/forms/return',
    transfer: '/forms/transfer',
  },
  historyRoutes: {
    issuance: '/assets-history/issuance',
    transfer: '/assets-history/transfer',
    return: '/assets-history/return',
    maintenance: '/assets-history/maintenance',
    repair: '/assets-history/repair',
    disposal: '/assets-history/disposal',
  },
} as const;
