import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ParticipantsPage from './pages/ParticipantsPage';
import NewParticipantPage from './pages/NewParticipantPage';
import ParticipantProfilePage from './pages/ParticipantProfilePage';
import ParticipantEditPage from './pages/ParticipantEditPage';
import AssessmentsListPage from './pages/AssessmentsListPage';
import AssessmentPage from './pages/AssessmentPage';
import InterventionsPage from './pages/InterventionsPage';
import AllInterventionsPage from './pages/AllInterventionsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import FairnessPage from './pages/FairnessPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ModelPerformancePage from './pages/ModelPerformancePage';
import ModelCardPage from './pages/ModelCardPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

function Protected({ children, allowedRoles }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/participants" element={<Protected><ParticipantsPage /></Protected>} />
      <Route path="/participants/new" element={<Protected><NewParticipantPage /></Protected>} />
      <Route path="/participants/:participantId/edit" element={<Protected><ParticipantEditPage /></Protected>} />
      <Route path="/participants/:participantId" element={<Protected><ParticipantProfilePage /></Protected>} />

      <Route path="/assessments" element={<Protected><AssessmentsListPage /></Protected>} />
      <Route path="/assessments/new" element={<Protected><AssessmentPage /></Protected>} />
      <Route path="/assessments/:assessmentId" element={<Protected><AssessmentPage /></Protected>} />

      <Route path="/interventions" element={<Protected><InterventionsPage /></Protected>} />
      <Route path="/interventions/all" element={<Protected><AllInterventionsPage /></Protected>} />

      <Route path="/analytics" element={<Protected allowedRoles={['ADMIN','JUDGE','CASE_MANAGER']}><AnalyticsPage /></Protected>} />
      <Route path="/fairness" element={<Protected allowedRoles={['ADMIN','JUDGE']}><FairnessPage /></Protected>} />
      <Route path="/audit-logs" element={<Protected allowedRoles={['ADMIN','JUDGE']}><AuditLogsPage /></Protected>} />
      <Route path="/model-performance" element={<Protected allowedRoles={['ADMIN','JUDGE','CASE_MANAGER']}><ModelPerformancePage /></Protected>} />
      <Route path="/model-card" element={<Protected><ModelCardPage /></Protected>} />
      <Route path="/admin" element={<Protected allowedRoles={['ADMIN']}><AdminPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
