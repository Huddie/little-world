import { Baby, BookOpen, ChevronDown, LayoutDashboard, LogIn, Settings, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import type { ChildSummary } from "../../types/client";

const publicNavItems = [
  { to: "/", label: "Home", icon: Sparkles },
  { to: "/pricing", label: "Pricing", icon: BookOpen },
  { to: "/sign-in", label: "Sign in", icon: LogIn },
];

const signedInNavItems = [
  { to: "/app", label: "Stories", icon: LayoutDashboard },
  { to: "/account", label: "Account", icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const [showAdmin, setShowAdmin] = useState(() => window.sessionStorage.getItem("little-world:admin") === "true");
  const [signedIn, setSignedIn] = useState(() => window.sessionStorage.getItem("little-world:signed-in") === "true");

  useEffect(() => {
    let mounted = true;
    void apiClient.getProfile()
      .then(() => {
        if (mounted) {
          window.sessionStorage.setItem("little-world:signed-in", "true");
          setSignedIn(true);
        }
      })
      .catch(() => {
        if (mounted) {
          window.sessionStorage.removeItem("little-world:signed-in");
          setSignedIn(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setShowAdmin(false);
      return;
    }

    let mounted = true;
    void apiClient.getAdminAccess()
      .then((access) => {
        if (mounted) {
          const allowed = access.permissions.includes("admin:read");
          window.sessionStorage.setItem("little-world:admin", allowed ? "true" : "false");
          setShowAdmin(allowed);
        }
      })
      .catch(() => {
        if (mounted) {
          window.sessionStorage.removeItem("little-world:admin");
          setShowAdmin(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [signedIn]);

  const baseNavItems = signedIn ? signedInNavItems : publicNavItems;
  const visibleNavItems = showAdmin ? [...baseNavItems, { to: "/admin/book-issues", label: "Admin", icon: BookOpen }] : baseNavItems;

  return (
    <div className="min-h-screen bg-transparent text-moss-900 dark:text-slate-100">
      <header className="border-b border-moon-200 bg-white shadow-sm shadow-moon-900/10 dark:border-white/10 dark:bg-slate-950/90 dark:shadow-black/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <NavLink className="flex items-center gap-3" to={signedIn ? "/app" : "/"}>
            <span className="grid h-11 w-11 place-items-center rounded-md border border-moon-200 bg-white shadow-sm shadow-moon-900/10">
              <img alt="" className="h-10 w-10" src="/brand/little-world-icon.svg" />
            </span>
            <span>
              <span className="block text-base font-bold">Little World</span>
              <span className="block text-xs font-medium text-moss-700 dark:text-slate-300">Your little one’s little world</span>
            </span>
          </NavLink>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {signedIn ? <ChildSwitcher /> : null}
            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  className={({ isActive }) =>
                    `group/nav inline-flex h-10 items-center overflow-hidden rounded-md text-sm font-semibold transition-colors duration-200 ${
                      isActive || (item.to === "/app" && /^\/app\/children\/[^/]+$/.test(location.pathname))
                        ? "bg-moss-700 text-white shadow-sm shadow-moss-900/15 dark:bg-moss-300 dark:text-slate-950"
                        : "text-moss-700 hover:bg-moon-50 hover:text-moss-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
                    }`
                  }
                  key={item.to}
                  end={item.to === "/app" || item.to === "/account"}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      <span className="grid h-10 w-10 shrink-0 place-items-center">
                        <Icon aria-hidden="true" size={16} />
                      </span>
                      <span
                        className={`nav-label whitespace-nowrap ${
                          isActive || (item.to === "/app" && /^\/app\/children\/[^/]+$/.test(location.pathname))
                            ? "nav-label-open"
                            : "group-hover/nav:nav-label-open group-focus-visible/nav:nav-label-open"
                        }`}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function ChildSwitcher() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<ChildSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    void apiClient.getChildren()
      .then((result) => {
        if (mounted) setChildren(result.filter((child) => !child.archivedAt));
      })
      .catch(() => {
        if (mounted) setChildren([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (children.length === 0) {
    return (
      <Link className="inline-flex h-10 items-center justify-center rounded-md border border-moon-200 bg-white px-3 text-sm font-bold text-moss-900 shadow-sm dark:border-white/15 dark:bg-slate-900 dark:text-slate-100" to="/onboarding">
        Add child
      </Link>
    );
  }

  const activeChildId = window.sessionStorage.getItem("little-world:active-child-id") ?? children[0]?.id;
  const activeChild = children.find((child) => child.id === activeChildId) ?? children[0];
  if (!activeChild) return null;
  const activeChildIndex = children.findIndex((child) => child.id === activeChild.id);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="inline-flex h-10 max-w-[240px] items-center gap-2 rounded-md border border-moon-200 bg-white px-3 text-sm font-bold text-moss-900 shadow-sm transition hover:border-moon-300 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-moon-300"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Baby size={16} />
        <span className="truncate">{childLabel(activeChild, activeChildIndex)}</span>
        <span className="rounded-full bg-moon-100 px-2 py-0.5 text-[11px] font-bold dark:bg-white/10 dark:text-moon-100">{activeChild.worldBuildStatus === "READY" ? "Ready" : "Building"}</span>
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-moon-200 bg-white shadow-xl shadow-moss-900/10 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/30">
          {children.map((child, index) => (
            <button
              className="block w-full px-4 py-3 text-left transition hover:bg-moon-50 dark:hover:bg-white/8"
              key={child.id}
              onClick={() => {
                window.sessionStorage.setItem("little-world:active-child-id", child.id);
                setOpen(false);
                navigate(`/app/children/${child.id}`);
              }}
              type="button"
            >
              <span className="block text-sm font-black text-moss-900 dark:text-slate-100">{childLabel(child, index)}</span>
              <span className="mt-1 block text-xs font-semibold text-moss-700 dark:text-slate-300">
                {child.worldBuildStatus === "READY" ? "Ready" : "Building world"} · {child.latestBookStatus ?? "No story yet"}
              </span>
            </button>
          ))}
          <Link className="block border-t border-moon-100 px-4 py-3 text-sm font-bold text-moss-900 hover:bg-moon-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/8" onClick={() => setOpen(false)} to="/onboarding">
            + Add child
          </Link>
          <Link className="block border-t border-moon-100 px-4 py-3 text-sm font-bold text-moss-900 hover:bg-moon-50 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/8" onClick={() => setOpen(false)} to="/app/children">
            Manage children
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function childLabel(child: ChildSummary, index: number) {
  return child.firstName?.trim() || `Kid ${index + 1}`;
}
