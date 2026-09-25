// All the routes in one place.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { GuestOnly, RequireAuth, RequirePermission } from './components/RouteGuards.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import AcceptInvitePage from './pages/AcceptInvitePage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import MembersPage from './pages/MembersPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />

          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<BoardPage />} />
            <Route path="teams" element={<TeamsPage />} />
            <Route
              path="members"
              element={<RequirePermission action="member:manage"><MembersPage /></RequirePermission>}
            />
            <Route path="activity" element={<ActivityPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
