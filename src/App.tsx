/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import SalesHistory from "./pages/SalesHistory";
import PurchaseOrders from "./pages/PurchaseOrders";
import Deliveries from "./pages/Deliveries";
import CustomerReturns from "./pages/CustomerReturns";
import Messages from "./pages/Messages";
import Quotes from "./pages/Quotes";
import SystemLocked from "./components/SystemLocked";

// A simple wrapper to protect routes based on role
function ProtectedRoute({
  children,
  restrictedRoles = [],
}: {
  children: React.ReactNode;
  restrictedRoles?: string[];
}) {
  const { role } = useAuth();

  if (restrictedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Ensure user is logged in
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const [isLocked, setIsLocked] = useState(
    localStorage.getItem("system_locked") === "true",
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLocked(localStorage.getItem("system_locked") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically in case it was changed in the same window (though React state usually handles that,
    // but since we use localStorage directly in Settings, we need to dispatch an event or poll)
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLocked && role !== "Super Admin") {
    return <SystemLocked />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/pos"
            element={
              <RequireAuth>
                <POS />
              </RequireAuth>
            }
          />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="inventory" element={<Products />} />
            <Route path="sales" element={<SalesHistory />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="returns" element={<CustomerReturns />} />
            <Route path="messages" element={<Messages />} />

            {/* Restricted Routes */}
            <Route
              path="reports"
              element={
                <ProtectedRoute restrictedRoles={["Cashier"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute restrictedRoles={["Cashier"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute restrictedRoles={["Cashier", "Manager"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
