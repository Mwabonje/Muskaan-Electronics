/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import SalesHistory from './pages/SalesHistory';
import PurchaseOrders from './pages/PurchaseOrders';
import Deliveries from './pages/Deliveries';
import CustomerReturns from './pages/CustomerReturns';
import Messages from './pages/Messages';
import Quotes from './pages/Quotes';

// A simple wrapper to protect routes based on role
function ProtectedRoute({ children, restrictedRoles = [] }: { children: React.ReactNode, restrictedRoles?: string[] }) {
  const { role } = useAuth();
  
  if (restrictedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Ensure user is logged in
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background-light">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/pos" element={
            <RequireAuth>
              <POS />
            </RequireAuth>
          } />
          
          <Route path="/" element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<SalesHistory />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="returns" element={<CustomerReturns />} />
            <Route path="messages" element={<Messages />} />
            
            {/* Restricted Routes */}
            <Route path="reports" element={
              <ProtectedRoute restrictedRoles={['Cashier']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="users" element={
              <ProtectedRoute restrictedRoles={['Cashier']}>
                <Users />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute restrictedRoles={['Cashier']}>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
