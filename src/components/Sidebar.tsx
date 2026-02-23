"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  LogOut,
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  UserCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";

export interface NavItem {
  icon: any;
  label: string;
  path?: string;
  tab?: string;
  onClick?: () => void;
}

const DASHBOARD_NAV: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CalendarDays, label: "Events", path: "/events/new" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: UserCircle, label: "Profile", path: "/profile" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  navItems?: NavItem[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  title?: string;
  titleIcon?: any;
}

export const Sidebar = ({
  open,
  onClose,
  navItems = DASHBOARD_NAV,
  activeTab,
  onTabChange,
  title = "Regixo",
  titleIcon: TitleIcon,
}: SidebarProps) => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    onClose();
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.tab && onTabChange) {
      onTabChange(item.tab);
      onClose();
    } else if (item.path) {
      router.push(item.path);
    }
  };

  const isItemActive = (item: NavItem) => {
    if (item.tab) return activeTab === item.tab;
    if (item.path) return pathname === item.path;
    return false;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-[100dvh] flex flex-col shrink-0
          border-r border-zinc-200 dark:border-zinc-800
          bg-white dark:bg-zinc-900
          transition-all duration-300 ease-in-out w-60
          ${collapsed ? "lg:w-[68px]" : "lg:w-60"}
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <Link
            href="/"
            className={`flex items-center gap-2 text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden
              transition-all duration-300 text-zinc-900 dark:text-zinc-100
              ${collapsed ? "lg:w-0 lg:opacity-0 lg:pointer-events-none" : "opacity-100"}`}
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {TitleIcon && <TitleIcon className="h-5 w-5 shrink-0" />}
            {title}
          </Link>

          {/* Collapse button - desktop */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md
              text-zinc-500 dark:text-zinc-400
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Close button - mobile */}
          <button
            onClick={onClose}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md
              text-zinc-500 dark:text-zinc-400
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item)}
                className={`relative w-full flex items-center gap-3 rounded-lg text-sm font-medium
                  transition-all duration-200 cursor-pointer group px-3 py-2.5
                  ${collapsed ? "lg:justify-center lg:px-0" : ""}
                  ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span
                  className={`whitespace-nowrap overflow-hidden transition-all duration-300
                    ${collapsed ? "lg:w-0 lg:opacity-0" : "opacity-100"}`}
                >
                  {item.label}
                </span>

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span
                    className="absolute left-full ml-3 px-2.5 py-1.5 text-xs rounded-md shadow-lg
                      whitespace-nowrap pointer-events-none z-50
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block
                      bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="mt-auto p-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <div
            className={`flex items-center gap-3 rounded-lg px-2 py-2
              hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors
              ${collapsed ? "lg:flex-col lg:px-0" : ""}`}
          >
            {/* Avatar */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                text-xs font-bold bg-zinc-200 dark:bg-zinc-700
                text-zinc-900 dark:text-zinc-100"
            >
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>

            {/* Email + logout - expanded */}
            <div
              className={`flex flex-1 items-center justify-between min-w-0 overflow-hidden
                transition-all duration-300
                ${collapsed ? "lg:w-0 lg:h-0 lg:opacity-0 lg:pointer-events-none" : "opacity-100"}`}
            >
              <p className="text-xs font-medium truncate text-zinc-700 dark:text-zinc-300">
                {user?.email}
              </p>
              <button
                onClick={signOut}
                className="ml-2 shrink-0 text-zinc-500 dark:text-zinc-400
                  hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            {/* Logout only - collapsed */}
            <button
              onClick={signOut}
              className={`text-zinc-500 dark:text-zinc-400
                hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors
                ${collapsed ? "lg:flex hidden" : "hidden"}`}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
