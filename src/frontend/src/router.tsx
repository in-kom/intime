import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "./pages/dashboard";
import KanbanPage from "./pages/kanban";
import DatabasePage from "./pages/database";
import CalendarPage from "./pages/calendar";
import ProjectDetailsPage from "./pages/project-details";
import CompanySettingsPage from "@/pages/company-settings";
import UserSettingsPage from "@/pages/user-settings";
import GanttPage from "@/pages/gantt";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ProjectsProvider } from "./contexts/projects-context";

// Create a root layout component that provides the auth context
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <ProjectsProvider>{children}</ProjectsProvider>
    </AuthProvider>
  );
};

// Create a router function that accepts the state setter from the AppRouter component
const router = createBrowserRouter([
  {
    element: (
      <AppLayout>
        <LoginPage />
      </AppLayout>
    ),
    path: "/login",
  },
  {
    element: (
      <AppLayout>
        <RegisterPage />
      </AppLayout>
    ),
    path: "/register",
  },
  {
    path: "/",
    element: (
      <AppLayout>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </AppLayout>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      { path: "kanban/:projectId", element: <KanbanPage /> },
      { path: "calendar/:projectId", element: <CalendarPage /> },
      { path: "database/:projectId", element: <DatabasePage /> },
      { path: "/project-details/:projectId", element: <ProjectDetailsPage /> },
      {
        path: "/company-settings/:companyId",
        element: <CompanySettingsPage />,
      },
      { path: "/user-settings", element: <UserSettingsPage /> },
      { path: "/gantt/:projectId", element: <GanttPage /> }, // Add Gantt route
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
