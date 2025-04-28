import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "./pages/dashboard";
import KanbanPage from "./pages/kanban";
import DatabasePage from "./pages/database";
import CalendarPage from "./pages/calendar";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";

// Create a root layout component that provides the auth context
const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

const router = createBrowserRouter([
  {
    element: <AuthLayout><LoginPage /></AuthLayout>,
    path: "/login",
  },
  {
    element: <AuthLayout><RegisterPage /></AuthLayout>,
    path: "/register",
  },
  {
    path: "/",
    element: (
      <AuthLayout>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </AuthLayout>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "kanban/:projectId", element: <KanbanPage /> },
      { path: "calendar/:projectId", element: <CalendarPage /> },
      { path: "database/:projectId", element: <DatabasePage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
