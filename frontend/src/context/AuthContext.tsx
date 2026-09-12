import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserMembership {
  id: string;
  user_id: string;
  university_id: string;
  role: 'STUDENT' | 'ADMIN' | 'UNIVERSITY_OWNER' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_INVITE';
  department?: string;
  student_id?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_super_admin: boolean;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  memberships: UserMembership[];
  activeUniversityId: string | null;
  setActiveUniversityId: (id: string | null) => void;
  login: (token: string, user: UserProfile, memberships: UserMembership[]) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const getRoleDashboardPath = (
  user: UserProfile | null,
  memberships: UserMembership[],
  activeUniversityId?: string | null
): string => {
  if (!user) return '/login';
  if (user.is_super_admin) return '/platform/dashboard';

  const activeMem = memberships.find(
    (m) => m.status === 'ACTIVE' && (!activeUniversityId || m.university_id === activeUniversityId)
  ) || memberships.find((m) => m.status === 'ACTIVE');

  if (!activeMem) {
    if (user.is_super_admin) return '/platform/dashboard';
    return '/student/dashboard';
  }

  switch (activeMem.role) {
    case 'SUPER_ADMIN':
      return '/platform/dashboard';
    case 'UNIVERSITY_OWNER':
      return '/owner/dashboard';
    case 'ADMIN':
      return '/admin/dashboard';
    case 'STUDENT':
      return '/student/dashboard';
    default:
      return '/student/dashboard';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [activeUniversityId, setActiveUniversityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('campusfix_token');
      const savedUser = localStorage.getItem('campusfix_user');
      const savedMemberships = localStorage.getItem('campusfix_memberships');
      const savedUnivId = localStorage.getItem('campusfix_univ_id');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        const parsedMems = savedMemberships ? JSON.parse(savedMemberships) : [];
        setMemberships(parsedMems);
        setActiveUniversityId(savedUnivId || (parsedMems[0]?.university_id ?? null));
      }
    } catch (e) {
      console.error('Failed to parse stored auth credentials', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: UserProfile, newMemberships: UserMembership[]) => {
    setToken(newToken);
    setUser(newUser);
    setMemberships(newMemberships);
    localStorage.setItem('campusfix_token', newToken);
    localStorage.setItem('campusfix_user', JSON.stringify(newUser));
    localStorage.setItem('campusfix_memberships', JSON.stringify(newMemberships));
    if (newMemberships.length > 0) {
      setActiveUniversityId(newMemberships[0].university_id);
      localStorage.setItem('campusfix_univ_id', newMemberships[0].university_id);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMemberships([]);
    setActiveUniversityId(null);
    localStorage.removeItem('campusfix_token');
    localStorage.removeItem('campusfix_user');
    localStorage.removeItem('campusfix_memberships');
    localStorage.removeItem('campusfix_univ_id');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        memberships,
        activeUniversityId,
        setActiveUniversityId,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
