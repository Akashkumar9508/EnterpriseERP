import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import ManagePage from '@/pages/ManagePage';
import ManageRole from '@/pages/ManageRole';
import ManageMenu from '@/pages/ManageMenu';
import ManageRoleMenu from '@/pages/ManageRoleMenu';
import Layout from '@/components/layout';
import { useAppSelector } from '@/store/hooks';
import { Toaster } from '@/components/ui/sonner';

export function App() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <>
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />} 
      />
      
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout>
              <Routes>
                <Route path="home" element={<Home />} />
                <Route path="manage-page" element={<ManagePage />} />
                <Route path="manage-role" element={<ManageRole />} />
                <Route path="manage-menu" element={<ManageMenu />} />
                <Route path="manage-role-menu" element={<ManageRoleMenu />} />
                {/* Fallback for routes that haven't been created yet */}
                <Route 
                  path="*" 
                  element={
                    <div className="flex flex-col items-center justify-center py-20">
                      <h2 className="text-2xl font-semibold mb-2">Page under construction</h2>
                      <p className="text-muted-foreground">This module is not implemented yet.</p>
                    </div>
                  } 
                />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
    <Toaster position="bottom-right" richColors />
    </>
  );
}

export default App;
