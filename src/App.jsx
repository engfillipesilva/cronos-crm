import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ChecklistPage from './pages/ChecklistPage';
import OrganMenuPage from './pages/OrganMenuPage';
import OrganDashboardPage from './pages/OrganDashboardPage';
import FollowUpPage from './pages/FollowUpPage';
import LabelsPage from './pages/LabelsPage';
import ImportPage from './pages/ImportPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/checklist" element={<ChecklistPage />} />
            <Route path="/etiquetas" element={<LabelsPage />} />
            <Route path="/orgaos" element={<OrganMenuPage />} />
            <Route path="/organ/:organId" element={<OrganDashboardPage />} />
            <Route path="/follow-up" element={<FollowUpPage />} />
            <Route path="/importar" element={<ImportPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Routes>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'toast-custom',
            duration: 3000,
          }}
        />
      </BrowserRouter>
    </AppProvider>
  );
}
