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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('campusfix_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('campusfix_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [memberships, setMemberships] = useState<UserMembership[]>(() => {
    const saved = localStorage.getItem('campusfix_memberships');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeUniversityId, setActiveUniversityId] = useState<string | null>(() => {
    return localStorage.getItem('campusfix_univ_id') || (memberships[0]?.university_id ?? null);
  });

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
        isAuthenticated: !!token && !!user
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
