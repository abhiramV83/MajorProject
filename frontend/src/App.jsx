import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ParticipantsPage from './pages/ParticipantsPage';
import ParticipantProfilePage from './pages/ParticipantProfilePage';
import ParticipantFormPage from './pages/ParticipantFormPage';
import AssessmentsListPage from './pages/AssessmentsListPage';
import AssessmentDetailPage from './pages/AssessmentDetailPage';
import InterventionsPage from './pages/InterventionsPage';
import ModelPerformancePage from './pages/ModelPerformancePage';
import FairnessAuditPage from './pages/FairnessAuditPage';
import ModelCardPage from './pages/ModelCardPage';
import AuditLogsPage from './pages/AuditLogsPage';
import NotFoundPage from './pages/NotFoundPage';
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
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/participants"
        element={
          <Protected>
            <ParticipantsPage />
          </Protected>
        }
      />
      <Route
        path="/participants/new"
        element={
          <Protected>
            <ParticipantFormPage />
          </Protected>
        }
      />
      <Route
        path="/participants/:participantId/edit"
        element={
          <Protected>
            <ParticipantFormPage />
          </Protected>
        }
      />
      <Route
        path="/participants/:participantId"
        element={
          <Protected>
            <ParticipantProfilePage />
          </Protected>
        }
      />

      <Route
        path="/assessments"
        element={
          <Protected>
            <AssessmentsListPage />
          </Protected>
        }
      />
      <Route
        path="/assessments/new"
        element={
          <Protected>
            <AssessmentDetailPage />
          </Protected>
        }
      />
      <Route
        path="/assessments/:assessmentId"
        element={
          <Protected>
            <AssessmentDetailPage />
          </Protected>
        }
      />

      <Route
        path="/interventions"
        element={
          <Protected>
            <InterventionsPage />
          </Protected>
        }
      />

      <Route
        path="/model-performance"
        element={
          <Protected allowedRoles={['ADMIN', 'JUDGE', 'CASE_MANAGER']}>
            <ModelPerformancePage />
          </Protected>
        }
      />
      <Route
        path="/fairness"
        element={
          <Protected allowedRoles={['ADMIN', 'JUDGE', 'CASE_MANAGER', 'STAFF']}>
            <FairnessAuditPage />
          </Protected>
        }
      />
      <Route
        path="/model-card"
        element={
          <Protected>
            <ModelCardPage />
          </Protected>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <Protected allowedRoles={['ADMIN', 'JUDGE', 'CASE_MANAGER', 'STAFF']}>
            <AuditLogsPage />
          </Protected>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
