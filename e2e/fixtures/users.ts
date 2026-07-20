export const E2E_USERS = {
  admin: {
    email: 'e2e-admin@test.com',
    password: 'E2eAdmin123!',
    name: 'E2E Admin',
    role: 'Global Admin',
  },
  manager: {
    email: 'e2e-manager@test.com',
    password: 'E2eManager123!',
    name: 'E2E Manager',
    role: 'Manager',
  },
  user: {
    email: 'e2e-user@test.com',
    password: 'E2eUser123!',
    name: 'E2E User',
    role: 'User',
  },
} as const;
