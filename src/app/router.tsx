import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminShell } from "../components/layout/AdminShell";
import { AppShell } from "../components/layout/AppShell";
import { AdminBookIssueDetailPage, AdminBookIssuesPage, AdminChildrenPage, AdminDeliveriesPage, AdminFailuresPage, AdminMemoryPage, AdminSubscriptionsPage, AdminUsersPage, AdminWorldPage } from "./AdminPages";
import { AccountPage } from "./AccountPage";
import { BookDetailPage } from "./BookDetailPage";
import { ChildrenPage } from "./ChildrenPage";
import { DashboardPage } from "./DashboardPage";
import { LandingPage } from "./LandingPage";
import { OnboardingPage } from "./OnboardingPage";
import { PricingPage } from "./PricingPage";
import { RouteErrorPage } from "./RouteErrorPage";
import { SignInPage } from "./SignInPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/pricing", element: <PricingPage /> },
      { path: "/app", element: <DashboardPage /> },
      { path: "/app/children", element: <ChildrenPage /> },
      { path: "/app/children/:childId", element: <DashboardPage /> },
      { path: "/account", element: <AccountPage /> },
      { path: "/sign-in", element: <SignInPage /> },
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/books/:id", element: <BookDetailPage /> },
      {
        path: "/admin",
        element: <AdminShell />,
        children: [
          { index: true, element: <Navigate replace to="/admin/book-issues" /> },
          { path: "users", element: <AdminUsersPage /> },
          { path: "children", element: <AdminChildrenPage /> },
          { path: "subscriptions", element: <AdminSubscriptionsPage /> },
          { path: "book-issues", element: <AdminBookIssuesPage /> },
          { path: "book-issues/:id", element: <AdminBookIssueDetailPage /> },
          { path: "deliveries", element: <AdminDeliveriesPage /> },
          { path: "world", element: <AdminWorldPage /> },
          { path: "memory", element: <AdminMemoryPage /> },
          { path: "failures", element: <AdminFailuresPage /> },
        ],
      },
    ],
  },
]);
