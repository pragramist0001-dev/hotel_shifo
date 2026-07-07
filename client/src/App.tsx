import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useSocketStore } from './stores/useSocketStore';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Layouts
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoomsPage from './pages/RoomsPage';
import CheckInPage from './pages/CheckInPage';
import ClientsPage from './pages/ClientsPage';
import ClientProfilePage from './pages/ClientProfilePage';
import FinancePage from './pages/FinancePage';
import StaffPage from './pages/StaffPage';
import ProfilePage from './pages/ProfilePage';
import ReceptionDashboardPage from './pages/ReceptionDashboardPage';
import ReportsPage from './pages/ReportsPage';

// Role-based guard
function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user?.role !== 'admin') return <Navigate to="/rooms" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated, user } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 50 });
    
    if (isAuthenticated) {
      const token = localStorage.getItem('accessToken');
      if (token) connect(token);
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          {/* Index: Admin → Dashboard, Reception → Reception kabineti */}
          <Route index element={
            user?.role === 'admin'
              ? <DashboardPage />
              : <ReceptionDashboardPage />
          } />

          {/* Shared */}
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/profile/:phone" element={<ClientProfilePage />} />

          {/* Admin only */}
          <Route path="finance" element={
            <AdminOnly><FinancePage /></AdminOnly>
          } />
          <Route path="staff" element={
            <AdminOnly><StaffPage /></AdminOnly>
          } />

          {/* Catch all → redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
