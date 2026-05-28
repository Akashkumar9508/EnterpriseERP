import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import ManagePage from '@/pages/ManagePage';
import ManageRole from '@/pages/ManageRole';
import ManageMenu from '@/pages/ManageMenu';
import ManageRoleMenu from '@/pages/ManageRoleMenu';
import ManageStaff from '@/pages/ManageStaff';
import ManageStaffLogin from '@/pages/ManageStaffLogin';
import ChangePassword from '@/pages/ChangePassword';
import ManageUnit from '@/pages/ManageUnit';
import ManageCategory from '@/pages/ManageCategory';
import ManageDesignation from '@/pages/ManageDesignation';
import ManageDepartment from '@/pages/ManageDepartment';
import ManageGST from '@/pages/ManageGST';
import ManageCompany from '@/pages/ManageCompany';
import ManageState from '@/pages/ManageState';
import ManageCity from '@/pages/ManageCity';
import ManageProduct from '@/pages/ManageProduct';
import GenerateBarcode from '@/pages/GenerateBarcode';
import ProductAttributes from '@/pages/ProductAttributes';
import ManageStockAdjustment from '@/pages/ManageStockAdjustment';
import ManageStockTransfer from '@/pages/ManageStockTransfer';
import InventoryStatus from '@/pages/InventoryStatus';
import ManagePurchaseInvoice from '@/pages/ManagePurchaseInvoice';
import CreatePurchaseInvoice from '@/pages/CreatePurchaseInvoice';
import ManageBrand from '@/pages/ManageBrand';
import ManageManufacturer from '@/pages/ManageManufacturer';
import ManageWarehouse from '@/pages/ManageWarehouse';
import ManageHSNCode from '@/pages/ManageHSNCode';
import ManageCustomer from '@/pages/ManageCustomer';
import ManageSupplier from '@/pages/ManageSupplier';
import PurchaseReports from '@/pages/PurchaseReports';
import ManagePurchaseReturn from '@/pages/ManagePurchaseReturn';
import CreatePurchaseReturn from '@/pages/CreatePurchaseReturn';
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
                <Route path="manage-staff" element={<ManageStaff />} />
                <Route path="manage-staff-login" element={<ManageStaffLogin />} />
                <Route path="change-password" element={<ChangePassword />} />
                <Route path="unit" element={<ManageUnit />} />
                <Route path="category" element={<ManageCategory />} />
                <Route path="manage-designation" element={<ManageDesignation />} />
                <Route path="manage-department" element={<ManageDepartment />} />
                <Route path="manage-gst" element={<ManageGST />} />
                <Route path="manage-company" element={<ManageCompany />} />
                <Route path="manage-state" element={<ManageState />} />
                <Route path="manage-city" element={<ManageCity />} />
                <Route path="product" element={<ManageProduct />} />
                <Route path="generate-barcode" element={<GenerateBarcode />} />
                <Route path="product-attributes" element={<ProductAttributes />} />
                <Route path="stock-adjustment" element={<ManageStockAdjustment />} />
                <Route path="stock-transfer" element={<ManageStockTransfer />} />
                <Route path="stocktransfer" element={<ManageStockTransfer />} />
                <Route path="inventory-status" element={<InventoryStatus />} />
                <Route path="purchase-invoice" element={<ManagePurchaseInvoice />} />
                <Route path="purchase-invoice/create" element={<CreatePurchaseInvoice />} />
                <Route path="purchase-invoice/edit/:id" element={<CreatePurchaseInvoice />} />
                <Route path="purchase-return" element={<ManagePurchaseReturn />} />
                <Route path="purchase-return/create" element={<CreatePurchaseReturn />} />
                <Route path="purchase-reports" element={<PurchaseReports />} />
                <Route path="brand" element={<ManageBrand />} />
                <Route path="manufacturer" element={<ManageManufacturer />} />
                <Route path="warehouse" element={<ManageWarehouse />} />
                <Route path="hsncode" element={<ManageHSNCode />} />
                <Route path="customer" element={<ManageCustomer />} />
                <Route path="supplier" element={<ManageSupplier />} />
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
