import axios from "axios"

// const API_BASE = "https://localhost:44387";
const API_BASE = "http://localhost:5262"
// const API_BASE = "https://webapi.wellnesshospital.org";

export const IMAGE_BASE = `${API_BASE}/uploads/`

const axiosClient = axios.create({
  baseURL: `${API_BASE}/api`,
})

// 🔹 Request Interceptor — attaches JWT token to every request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("bteowkeelnl")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 🔹 Response Interceptor — central error handling + auto-logout on 401
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // If 401 Unauthorized, clear token and redirect to admin login
    if (error.response?.status === 401) {
      localStorage.removeItem("bteowkeelnl")
      // Only redirect if not already on /admin login page
      if (window.location.pathname !== "/admin") {
        window.location.href = "/admin"
      }
    }
    console.error("API Error:", error.response?.data || error.message)
    return Promise.reject(error.response?.data || "Something went wrong")
  }
)

export default axiosClient
