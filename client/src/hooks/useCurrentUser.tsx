import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Role } from '@/types/assets';
import { useAuth } from '@/context/AuthContext';

export interface CurrentUser {
  id: string;
  name: string;
  firstName: string | null;
  middleName?: string | null;
  lastName: string | null;
  email: string;
  username: string | null;
  contactNumber: string | null;
  position: string | null;
  department: string | null;
  department_id: string | null;
  company: string | null;
  company_id: string | null;
  employeeId: string | null;
  role_id: string | null;
  role?: Role;
  avatarUrl?: string;
  digitalSignature?: string | null;
  mfaEnabled?: boolean;
  verified: boolean;
  createdAt: string;
  hr_accountability_receiver?: boolean;

  address: {
    unitNo: string;
    buildingNo: string;
    street: string;
    subdivision: string;
    barangay: string;
    city: string;
    province: string;
    region: string;
  };
}

let cachedUser: CurrentUser | null = null;
let cachedRoles: Role[] = [];
let cachedDepartments: any[] = [];
let listeners: (() => void)[] = [];

const notifyAll = () => {
  listeners.forEach(listener => listener());
};

export function getAuthUserIdFromPayload(authPayload: unknown): string | null {
  if (!authPayload || typeof authPayload !== 'object' || !('user' in authPayload)) {
    return null;
  }
  const user = (authPayload as { user?: { id?: string } }).user;
  return user?.id ?? null;
}

/** Clear cached profile so the next login does not reuse the previous user. */
export function clearCurrentUserCache() {
  cachedUser = null;
  notifyAll();
}

export function useCurrentUser() {
  const { user: authPayload, isLoading: authLoading, isAuthenticated } =
    useAuth();
  const authUserId = getAuthUserIdFromPayload(authPayload);
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState<boolean>(!cachedUser);

  const buildUserObject = (data: Record<string, unknown>): CurrentUser => {
    const email = String(data.email ?? '');
    const fullName =
      [data.firstName, data.middleName, data.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || email.split('@')[0];

    const uploadedAvatarUrl =
      data.avatarUrl &&
      typeof data.avatarUrl === 'string' &&
      data.avatarUrl.trim() !== ''
        ? data.avatarUrl.trim()
        : null;

    const finalAvatarUrl =
      uploadedAvatarUrl ||
      `http://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dc2626&color=fff&bold=true&size=256`;

    const roleId = data.role_id as string | null | undefined;
    const role = cachedRoles.find(r => r.roleID === roleId) || undefined;

    let department =
      (data.department as string | null) ||
      (data.department_name as string | null) ||
      null;
    if (!department && data.department_id) {
      const dept = cachedDepartments.find(
        d => d.departmentID === data.department_id
      );
      department = dept ? dept.name : null;
    }

    return {
      id: String(data.id),
      name: fullName,
      firstName: (data.firstName as string | null) || null,
      middleName: (data.middleName as string | null) || null,
      lastName: (data.lastName as string | null) || null,
      email,
      username: (data.username as string | null) || null,
      contactNumber: (data.contactNumber as string | null) || null,
      position: (data.position as string | null) || null,
      department,
      department_id: (data.department_id as string | null) || null,
      company: (data.company as string | null) || null,
      company_id: (data.company_id as string | null) || null,
      employeeId: (data.employeeId as string | null) || null,
      role_id: roleId || null,
      role,
      verified: Boolean(data.verified),
      createdAt: String(data.createdAt ?? ''),
      avatarUrl: finalAvatarUrl,
      digitalSignature: (data.digitalSignature as string | null) || null,
      mfaEnabled: Boolean(data.mfaEnabled),
      hr_accountability_receiver: data.hr_accountability_receiver as
        | boolean
        | undefined,
      address: (data.address as CurrentUser['address']) || {
        unitNo: '',
        buildingNo: '',
        street: '',
        subdivision: '',
        barangay: '',
        city: '',
        province: '',
        region: '',
      },
    };
  };

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      if (cachedRoles.length === 0) {
        try {
          const { roles } = await api.get<{ roles: Role[] }>('/roles');
          cachedRoles = roles;
        } catch (err) {
          console.error('Failed to fetch roles:', err);
          cachedRoles = [];
        }
      }

      if (cachedDepartments.length === 0) {
        try {
          const { departments } = await api.get<{ departments: any[] }>(
            '/departments'
          );
          cachedDepartments = departments;
        } catch (err) {
          console.error('Failed to fetch departments:', err);
          cachedDepartments = [];
        }
      }

      const data = (
        await api.get<{ user: Record<string, unknown> }>('/auth/me')
      ).user;

      const newUser = buildUserObject(data);

      cachedUser = newUser;
      setUser(newUser);
      notifyAll();
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      clearCurrentUserCache();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [authPayload]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      clearCurrentUserCache();
      setUser(null);
      setLoading(false);
      return;
    }

    const cacheMismatch =
      cachedUser && authUserId && cachedUser.id !== authUserId;

    if (!cachedUser || cacheMismatch) {
      void refetch();
      return;
    }

    setUser(cachedUser);
    setLoading(false);
  }, [authLoading, isAuthenticated, authUserId, refetch]);

  useEffect(() => {
    const listener = () => {
      setUser(cachedUser);
    };
    listeners.push(listener);

    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  return { user, loading, refetch };
}
