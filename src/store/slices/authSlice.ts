import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

// Define the types based on the API response structure
export type Permission = {
  pageId: string
  pageName: string
  route: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export type SidebarItem = {
  roleId: string
  menuId: string
  parentId: string | null
  name: string
  icon: string
  sortOrder: number
  route: string | null
  children: SidebarItem[]
}

export type User = {
  id: string
  companyId: string
  branchId: string
  roleId: string
  roleName: string
  fullName: string
  username: string
  email: string
  warehouseId?: string | null
  warehouseName?: string | null
}

export type License = {
  id: number
  licenseKey: string
  packageType: string
  validFrom: string
  validTo: string
  maxCompanies: number
  maxBranches: number
  maxWarehouses: number
  isActive: boolean
}

export type AuthData = {
  token: string
  user: User
  sidebar: SidebarItem[]
  permissions: Permission[]
  isLicenseExpired: boolean
  licenseDetails: License | null
}

type AuthState = {
  user: User | null
  sidebar: SidebarItem[]
  permissions: Permission[]
  isAuthenticated: boolean
  isLicenseExpired: boolean
  licenseDetails: License | null
}

const getInitialState = (): AuthState => {
  const storedData = sessionStorage.getItem("userData")
  if (storedData) {
    try {
      const parsed = JSON.parse(storedData)
      return {
        user: parsed.user || null,
        sidebar: parsed.sidebar || [],
        permissions: parsed.permissions || [],
        isAuthenticated: !!parsed.user,
        isLicenseExpired: parsed.isLicenseExpired ?? false,
        licenseDetails: parsed.licenseDetails || null,
      }
    } catch (e) {
      console.error("Failed to parse userData from sessionStorage", e)
    }
  }
  return {
    user: null,
    sidebar: [],
    permissions: [],
    isAuthenticated: false,
    isLicenseExpired: false,
    licenseDetails: null,
  }
}

const initialState: AuthState = getInitialState()

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthData: (state, action: PayloadAction<AuthData>) => {
      sessionStorage.setItem("userData", JSON.stringify(action.payload))
      sessionStorage.setItem("bteowkeelnl", action.payload.token)
      state.user = action.payload.user
      state.sidebar = action.payload.sidebar
      state.permissions = action.payload.permissions
      state.isLicenseExpired = action.payload.isLicenseExpired
      state.licenseDetails = action.payload.licenseDetails
      state.isAuthenticated = true
    },
    logout: (state) => {
      sessionStorage.removeItem("userData")
      sessionStorage.removeItem("bteowkeelnl")
      state.user = null
      state.sidebar = []
      state.permissions = []
      state.isLicenseExpired = false
      state.licenseDetails = null
      state.isAuthenticated = false
      if (window.location.pathname !== "/") {
        window.location.href = "/"
      }
    },
    setLicenseExpired: (state, action: PayloadAction<{ isExpired: boolean; details?: License | null }>) => {
      state.isLicenseExpired = action.payload.isExpired
      if (action.payload.details !== undefined) {
        state.licenseDetails = action.payload.details
      }
      
      const storedData = sessionStorage.getItem("userData")
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData)
          parsed.isLicenseExpired = action.payload.isExpired
          if (action.payload.details !== undefined) {
            parsed.licenseDetails = action.payload.details
          }
          sessionStorage.setItem("userData", JSON.stringify(parsed))
        } catch (e) {
          console.error("Failed to update sessionStorage in setLicenseExpired", e)
        }
      }
    }
  },
})

export const { setAuthData, logout, setLicenseExpired } = authSlice.actions

export default authSlice.reducer
