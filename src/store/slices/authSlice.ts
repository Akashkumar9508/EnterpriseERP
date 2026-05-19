import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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

type AuthState = {
  user: User | null;
  sidebar: SidebarItem[];
  permissions: Permission[];
  isAuthenticated: boolean;
};

const getInitialState = (): AuthState => {
  const storedData = localStorage.getItem('userData');
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      return {
        user: parsed.user || null,
        sidebar: parsed.sidebar || [],
        permissions: parsed.permissions || [],
        isAuthenticated: !!parsed.user,
      };
    } catch (e) {
      console.error('Failed to parse userData from localStorage', e);
    }
  }
  return {
    user: null,
    sidebar: [],
    permissions: [],
    isAuthenticated: false,
  };
};

const initialState: AuthState = getInitialState();

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthData: (state, action: PayloadAction<AuthData>) => {
      localStorage.setItem('userData', JSON.stringify(action.payload));
      localStorage.setItem('bteowkeelnl', action.payload.token);
      state.user = action.payload.user;
      state.sidebar = action.payload.sidebar;
      state.permissions = action.payload.permissions;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      localStorage.removeItem('userData');
      localStorage.removeItem('bteowkeelnl');
      state.user = null;
      state.sidebar = [];
      state.permissions = [];
      state.isAuthenticated = false;
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    },
  },
});

export const { setAuthData, logout } = authSlice.actions;

export default authSlice.reducer;
