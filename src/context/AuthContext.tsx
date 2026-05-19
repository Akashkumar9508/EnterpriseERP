import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the types based on the API response structure
export type Permission = {
  pageId: string;
  pageName: string;
  route: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type SidebarItem = {
  roleId: string;
  menuId: string;
  parentId: string | null;
  name: string;
  icon: string;
  sortOrder: number;
  route: string | null;
  children: SidebarItem[];
};

export type User = {
  id: string;
  companyId: string;
  branchId: string;
  roleId: string;
  roleName: string;
  fullName: string;
  username: string;
  email: string;
};

export type AuthData = {
  token: string;
  user: User;
  sidebar: SidebarItem[];
  permissions: Permission[];
};

type AuthContextType = {
  user: User | null;
  sidebar: SidebarItem[];
  permissions: Permission[];
  isAuthenticated: boolean;
  logout: () => void;
  updateAuthData: (data: AuthData) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sidebar, setSidebar] = useState<SidebarItem[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const loadData = () => {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        if (parsed.user) setUser(parsed.user);
        if (parsed.sidebar) setSidebar(parsed.sidebar);
        if (parsed.permissions) setPermissions(parsed.permissions);
      } catch (e) {
        console.error('Failed to parse userData from localStorage', e);
      }
    }
  };

  useEffect(() => {
    loadData();

    // Listen to storage events so changes in other tabs or components can trigger updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userData') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('bteowkeelnl'); // Token
    setUser(null);
    setSidebar([]);
    setPermissions([]);
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  };

  const updateAuthData = (data: AuthData) => {
    localStorage.setItem('userData', JSON.stringify(data));
    localStorage.setItem('bteowkeelnl', data.token);
    setUser(data.user);
    setSidebar(data.sidebar);
    setPermissions(data.permissions);
  };

  const value = {
    user,
    sidebar,
    permissions,
    isAuthenticated: !!user,
    logout,
    updateAuthData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePermissions = (pageRouteOrName: string) => {
  const { permissions } = useAuth();
  
  // Find permission matching the specific page route or name (case-insensitive)
  const permission = permissions.find(
    (p) => 
      p.route?.toLowerCase() === pageRouteOrName.toLowerCase() || 
      p.pageName?.toLowerCase() === pageRouteOrName.toLowerCase()
  );

  return {
    canView: permission?.canView ?? false,
    canCreate: permission?.canCreate ?? false,
    canEdit: permission?.canEdit ?? false,
    canDelete: permission?.canDelete ?? false,
  };
};
