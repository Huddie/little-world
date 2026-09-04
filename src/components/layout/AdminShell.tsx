import { AlertTriangle, BookOpen, PackageCheck, RefreshCw, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const adminLinks = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/children", label: "Children", icon: Users },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { to: "/admin/book-issues", label: "Book Issues", icon: BookOpen },
  { to: "/admin/deliveries", label: "Deliveries", icon: PackageCheck },
  { to: "/admin/failures", label: "Failures", icon: AlertTriangle },
];

export function AdminShell() {
  return (
    <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
      <aside className="h-fit rounded-lg border border-moss-100 bg-white p-3 shadow-sm">
        <p className="px-3 pb-3 text-xs font-bold uppercase tracking-wide text-moss-700">Operations</p>
        <nav className="space-y-1">
          {adminLinks.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  `flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
                    isActive ? "bg-moon-100 text-moon-900" : "text-moss-700 hover:bg-moss-50"
                  }`
                }
                key={item.to}
                to={item.to}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <Outlet />
    </div>
  );
}
