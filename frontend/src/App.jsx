import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './routes/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
// Participant
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetails from './pages/participant/EventDetails';
import ParticipantProfile from './pages/participant/Profile';
import ClubsListing from './pages/participant/ClubsListing';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import TicketView from './pages/participant/TicketView';
// Organizer
import OrgDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OrgEventDetail from './pages/organizer/EventDetail';
import OrgProfile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';
import ScannerPage from './pages/organizer/ScannerPage';
import AttendanceDashboard from './pages/organizer/AttendanceDashboard';
// Admin
import AdminDashboard from './pages/admin/Dashboard';
import ManageClubs from './pages/admin/ManageClubs';
import PasswordResets from './pages/admin/PasswordResets';

import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

const AppLayout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="app-layout">
      {isAuthenticated && <Navbar />}
      {children}
    </div>
  );
};

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  const map = { participant: '/participant/dashboard', organizer: '/organizer/dashboard', admin: '/admin/dashboard' };
  return <Navigate to={map[user?.role] || '/login'} />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppLayout>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={
                <ProtectedRoute roles={['participant']}><Onboarding /></ProtectedRoute>
              } />

              {/* Participant */}
              <Route path="/participant/dashboard" element={
                <ProtectedRoute roles={['participant']}><ParticipantDashboard /></ProtectedRoute>
              } />
              <Route path="/participant/events" element={
                <ProtectedRoute roles={['participant']}><BrowseEvents /></ProtectedRoute>
              } />
              <Route path="/participant/ticket/:id" element={
                <ProtectedRoute roles={['participant']}><TicketView /></ProtectedRoute>
              } />
              <Route path="/participant/events/:id" element={
                <ProtectedRoute roles={['participant']}><EventDetails /></ProtectedRoute>
              } />
              <Route path="/participant/profile" element={
                <ProtectedRoute roles={['participant']}><ParticipantProfile /></ProtectedRoute>
              } />
              <Route path="/participant/clubs" element={
                <ProtectedRoute roles={['participant']}><ClubsListing /></ProtectedRoute>
              } />
              <Route path="/participant/clubs/:id" element={
                <ProtectedRoute roles={['participant']}><OrganizerDetail /></ProtectedRoute>
              } />

              {/* Organizer */}
              <Route path="/organizer/dashboard" element={
                <ProtectedRoute roles={['organizer']}><OrgDashboard /></ProtectedRoute>
              } />
              <Route path="/organizer/events/new" element={
                <ProtectedRoute roles={['organizer']}><CreateEvent /></ProtectedRoute>
              } />
              <Route path="/organizer/events/:id" element={
                <ProtectedRoute roles={['organizer']}><OrgEventDetail /></ProtectedRoute>
              } />
              <Route path="/organizer/events/:id/scan" element={
                <ProtectedRoute roles={['organizer']}><ScannerPage /></ProtectedRoute>
              } />
              <Route path="/organizer/events/:id/attendance" element={
                <ProtectedRoute roles={['organizer']}><AttendanceDashboard /></ProtectedRoute>
              } />
              <Route path="/organizer/profile" element={
                <ProtectedRoute roles={['organizer']}><OrgProfile /></ProtectedRoute>
              } />
              <Route path="/organizer/ongoing" element={
                <ProtectedRoute roles={['organizer']}><OngoingEvents /></ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/clubs" element={
                <ProtectedRoute roles={['admin']}><ManageClubs /></ProtectedRoute>
              } />
              <Route path="/admin/password-resets" element={
                <ProtectedRoute roles={['admin']}><PasswordResets /></ProtectedRoute>
              } />

              {/* 404 */}
              <Route path="*" element={
                <div className="loading-screen" style={{ flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 48 }}>404</span>
                  <p className="text-muted">Page not found</p>
                </div>
              } />
            </Routes>
          </AppLayout>
        </ErrorBoundary>
        <Toaster position="top-right" toastOptions={{ style: { fontSize: 14, borderRadius: 6 } }} />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
