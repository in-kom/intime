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
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useState } from "react";

// Create a root layout component that provides the auth context
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

// Create a router function that accepts the state setter from the AppRouter component
const createAppRouter = (setCurrentCompanyId: (id: string) => void) => {
  return createBrowserRouter([
    {
      element: (
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      ),
      path: "/login",
    },
    {
      element: (
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      ),
      path: "/register",
    },
    {
      path: "/",
      element: (
        <AuthLayout>
          <ProtectedRoute>
            <MainLayout setCurrentCompany={setCurrentCompanyId} />
          </ProtectedRoute>
        </AuthLayout>
      ),
      children: [
        {
          index: true,
          element: <DashboardPage currentCompanyId={null} />,
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
      ],
    },
  ]);
};

export function AppRouter() {
  // Move the useState hook inside the component
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
  
  // Create the router with the state setter
  const router = createAppRouter(setCurrentCompanyId);
  
  // Update the dashboard route with the current company ID
  if (router.routes[2]?.children?.[0]) {
    const dashboardRoute = router.routes[2]?.children?.[0] as { element?: React.ReactNode };
    if (dashboardRoute) {
      dashboardRoute.element = <DashboardPage currentCompanyId={currentCompanyId} />;
    }
  }
  
  return <RouterProvider router={router} />;
}
