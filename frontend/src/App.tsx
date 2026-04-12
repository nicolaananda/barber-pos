import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardHome } from './components/dashboard/DashboardHome';

const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const PosPage = lazy(() => import('./pages/POS'));
const StatusPage = lazy(() => import('./pages/Status'));
const BarberDashboard = lazy(() => import('./pages/dashboard/BarberDashboard'));
const DailyPage = lazy(() => import('./pages/dashboard/Daily'));
const ServicesPage = lazy(() => import('./pages/dashboard/Services'));
const CustomersPage = lazy(() => import('./pages/dashboard/Customers'));
const TransactionsPage = lazy(() => import('./pages/dashboard/Transactions'));
const ExpensesPage = lazy(() => import('./pages/dashboard/Expenses'));
const PayrollPage = lazy(() => import('./pages/dashboard/Payroll'));
const BookingsPage = lazy(() => import('./pages/dashboard/Bookings'));
const BarbersPage = lazy(() => import('./pages/dashboard/Barbers'));
const SchedulePage = lazy(() => import('./pages/dashboard/Schedule'));
const ProfitLossPage = lazy(() => import('./pages/dashboard/ProfitLoss'));
const AnalyticsPage = lazy(() => import('./pages/dashboard/Analytics'));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user is staff/barber and tries to access restricted page, redirect to POS
    if (user.role === 'staff') {
      return <Navigate to="/pos" replace />;
    }
    // Default fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {


  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div></div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['owner']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="daily" element={<DailyPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="profit-loss" element={<ProfitLossPage />} />
                <Route path="payroll" element={<PayrollPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="barbers" element={<BarbersPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
              </Route>
              <Route
                path="/pos"
                element={
                  <ProtectedRoute>
                    <PosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/barber"
                element={
                  <ProtectedRoute allowedRoles={['staff']}>
                    <BarberDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  (window.location.hostname.startsWith('pos.') || ['localhost', '127.0.0.1'].includes(window.location.hostname))
                    ? <Navigate to="/dashboard" replace />
                    : <StatusPage />
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
