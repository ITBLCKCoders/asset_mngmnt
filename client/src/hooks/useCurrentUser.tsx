import { useState, useEffect } from 'react';
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

export function useCurrentUser() {
  const { user: authPayload, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState<boolean>(!cachedUser);

  const buildUserObject = (data: any): CurrentUser => {
    const fullName =
      [data.firstName, data.middleName, data.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || data.email.split('@')[0];

    const uploadedAvatarUrl =
      data.avatarUrl &&
      typeof data.avatarUrl === 'string' &&
      data.avatarUrl.trim() !== ''
        ? data.avatarUrl.trim()
        : null;

    const finalAvatarUrl =
      uploadedAvatarUrl ||
      `http://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=dc2626&color=fff&bold=true&size=256`;

    const role = cachedRoles.find(r => r.roleID === data.role_id) || undefined;

    let department = data.department || data.department_name || null;
    if (!department && data.department_id) {
      const dept = cachedDepartments.find(
        d => d.departmentID === data.department_id
      );
      department = dept ? dept.name : null;
    }

    return {
      id: data.id,
      name: fullName,
      firstName: data.firstName || null,
      middleName: data.middleName || null,
      lastName: data.lastName || null,
      email: data.email,
      username: data.username || null,
      contactNumber: data.contactNumber || null,
      position: data.position || null,
      department,
      department_id: data.department_id || null,
      company: data.company || null,
      company_id: data.company_id || null,
      employeeId: data.employeeId || null,
      role_id: data.role_id || null,
      role,
      verified: data.verified,
      createdAt: data.createdAt,
      avatarUrl: finalAvatarUrl,
      digitalSignature: data.digitalSignature || null,
      mfaEnabled: data.mfaEnabled || false,
      hr_accountability_receiver: data.hr_accountability_receiver,
      address: data.address || {
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

  const refetch = async () => {
    setLoading(true);
    try {
      // Fetch roles if not cached
      if (cachedRoles.length === 0) {
        try {
          const { roles } = await api.get<{ roles: Role[] }>('/roles');
          cachedRoles = roles;
        } catch (err) {
          console.error('Failed to fetch roles:', err);
          cachedRoles = [];
        }
      }

      // Fetch departments if not cached
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

      const authUser =
        authPayload &&
        typeof authPayload === 'object' &&
        'user' in authPayload &&
        authPayload.user
          ? (authPayload as { user: Record<string, unknown> }).user
          : null;

      const data = authUser
        ? authUser
        : (await api.get<{ user: Record<string, unknown> }>('/auth/me')).user;

      const newUser = buildUserObject(data);

      cachedUser = newUser;
      setUser(newUser);
      notifyAll();
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      cachedUser = null;
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!cachedUser) {
      void refetch();
    } else {
      setUser(cachedUser);
      setLoading(false);
    }
  }, [authLoading]);

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
