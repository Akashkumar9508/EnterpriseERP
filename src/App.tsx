import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Layout from '@/components/layout';
import { useAuth } from '@/context/AuthContext';

export function App() {
  const { isAuthenticated } = useAuth();

  return (
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
  );
}

export default App;
