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
];

export const E2E_ROUTES = {
  public: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
  },
  authenticated: {
    dashboard: '/dashboard',
    profile: '/profile',
    myAssets: '/my-assets',
    assets: '/assets',
  },
  permissionGated: {
    users: '/user',
    reports: '/reports',
    settings: '/settings',
    audit: '/audit',
  },
} as const;
