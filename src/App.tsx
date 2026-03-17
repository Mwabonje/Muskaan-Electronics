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
import { getSystemSetting } from "./utils/settings";

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

function QuotesRoute() {
  const { role } = useAuth();
  const [quotesEnabled, setQuotesEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const checkQuotesEnabled = async () => {
      const enabled = await getSystemSetting("quotes_enabled_for_cashier");
      if (isMounted) {
        setQuotesEnabled(enabled !== "false"); // Default to true if not set
      }
    };

    checkQuotesEnabled();
    const interval = setInterval(checkQuotesEnabled, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (role === "Cashier" && !quotesEnabled) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Quotes />;
}

// Ensure user is logged in
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading } = useAuth();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkLockStatus = async () => {
      const locked = await getSystemSetting("system_locked");
      if (isMounted) {
        setIsLocked(locked === "true");
      }
    };

    checkLockStatus();
    const interval = setInterval(checkLockStatus, 5000);

    return () => {
      isMounted = false;
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
            <Route path="quotes" element={<QuotesRoute />} />
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
                <ProtectedRoute restrictedRoles={["Cashier", "Manager", "Admin"]}>
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
