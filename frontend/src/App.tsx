import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import { DashboardHome } from './components/dashboard/DashboardHome';
import DailyPage from './pages/dashboard/Daily';
import ServicesPage from './pages/dashboard/Services';
import CustomersPage from './pages/dashboard/Customers';
import TransactionsPage from './pages/dashboard/Transactions';
import ExpensesPage from './pages/dashboard/Expenses';
import PayrollPage from './pages/dashboard/Payroll';
import BookingsPage from './pages/dashboard/Bookings';
import BarbersPage from './pages/dashboard/Barbers';
import PosPage from './pages/POS';
import StatusPage from './pages/Status';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
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
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="barbers" element={<BarbersPage />} />
          </Route>
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <PosPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
