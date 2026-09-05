
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../../convex/_generated/api";

import {
  LayoutDashboard,
  Users,
  Puzzle,
  TestTube2,
  Code2,
  Zap,
  Trophy,
  BarChart3,
  Palette,
  Flag,
  Megaphone,
  Award,
  Shield,
  FileText,
  Settings,
  Globe,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  X,
  Target,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={19} />,
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: <Users size={19} />,
  },
  {
    href: "/admin/problems",
    label: "Problems",
    icon: <Puzzle size={19} />,
  },
  {
    href: "/admin/code-academy",
    label: "Code Academy",
    icon: <Sparkles size={19} />,
  },
  {
    href: "/admin/challenges",
    label: "Challenges",
    icon: <Trophy size={19} />,
  },
  {
    href: "/admin/talent-connect",
    label: "Talent Connect",
    icon: <Target size={19} />,
  },
  {
    href: "/admin/test-cases",
    label: "Test Cases",
    icon: <TestTube2 size={19} />,
  },
  {
    href: "/admin/submissions",
    label: "Submissions",
    icon: <Code2 size={19} />,
  },
  {
    href: "/admin/challenges/submissions",
    label: "Web Submissions",
    icon: <Globe size={19} />,
  },
  {
    href: "/admin/executions",
    label: "Executions",
    icon: <Zap size={19} />,
  },
  {
    href: "/admin/leaderboard",
    label: "Leaderboard",
    icon: <Trophy size={19} />,
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: <BarChart3 size={19} />,
  },
  {
    href: "/admin/showcase",
    label: "Showcase",
    icon: <Palette size={19} />,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: <Flag size={19} />,
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: <Megaphone size={19} />,
  },
  {
    href: "/admin/achievements",
    label: "Achievements",
    icon: <Award size={19} />,
  },
  {
    href: "/admin/roles",
    label: "Roles",
    icon: <Shield size={19} />,
    superAdminOnly: true,
  },
  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: <FileText size={19} />,
    superAdminOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: <Settings size={19} />,
    superAdminOnly: true,
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

export function AdminSidebar({
  isOpen,
  onToggle,
  mobile = false,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const identity = useQuery(api.roles.me);
  const isSuperAdmin = identity?.role === "SUPER_ADMIN";

  const visibleItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  );

  const sections = [
    {
      title: "Overview",
      items: visibleItems.slice(0, 1),
    },
    {
      title: "Management",
      items: visibleItems.slice(1, 8),
    },
    {
      title: "Platform",
      items: visibleItems.slice(8, 14),
    },
    {
      title: "System",
      items: visibleItems.slice(14),
    },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{
        width: mobile ? (isOpen ? 290 : 0) : isOpen ? 280 : 78,
        x: mobile && !isOpen ? -300 : 0,
      }}
      transition={{
        duration: 0.28,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="
        fixed inset-y-0 left-0 z-50
        flex shrink-0 flex-col
        overflow-hidden
        border-r border-white/[0.07]
        bg-[#0D1422]/95
        shadow-[20px_0_60px_rgba(0,0,0,0.25)]
        backdrop-blur-2xl
        lg:relative
        lg:z-30
      "
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

      {/* Brand */}
      <div className="relative flex h-[72px] shrink-0 items-center border-b border-white/[0.06] px-4">
        <Link
          href="/admin/dashboard"
          className="group flex min-w-0 items-center gap-3"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Code2 size={20} className="text-white" />

            <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          {isOpen && (
            <div className="min-w-0">
              <div className="text-[17px] font-bold tracking-tight text-white">
                Code<span className="text-blue-400">Rush</span>
              </div>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Admin Console
                </span>
              </div>
            </div>
          )}
        </Link>

        {mobile ? (
          <button
            onClick={onToggle}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
          >
            {isOpen ? (
              <ChevronLeft size={17} />
            ) : (
              <ChevronRight size={17} />
            )}
          </button>
        )}
      </div>

      {/* Search */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden px-3 pb-2 pt-3"
          >
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                type="text"
                placeholder="Search admin..."
                className="
                  h-10 w-full rounded-xl
                  border border-white/[0.06]
                  bg-white/[0.035]
                  pl-9 pr-3
                  text-sm text-white
                  outline-none
                  placeholder:text-slate-600
                  transition
                  focus:border-blue-500/40
                  focus:bg-white/[0.05]
                  focus:ring-2
                  focus:ring-blue-500/10
                "
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {sections.map((section) => {
          if (!section.items.length) return null;

          return (
            <div key={section.title} className="mb-5">
              {isOpen && (
                <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  {section.title}
                </div>
              )}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={!isOpen ? item.label : undefined}
                        onClick={() => {
                          if (mobile) onToggle();
                        }}
                        className={`
                          group relative flex h-11 items-center
                          ${isOpen ? "gap-3 px-3" : "justify-center px-2"}
                          rounded-xl
                          text-[13px] font-medium
                          transition-all duration-200
                          ${isActive
                            ? "text-white"
                            : "text-slate-500 hover:bg-white/[0.045] hover:text-slate-200"
                          }
                        `}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="admin-active-nav"
                            className="absolute inset-0 rounded-xl border border-blue-400/10 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent"
                            transition={{
                              duration: 0.25,
                              ease: "easeOut",
                            }}
                          />
                        )}

                        {isActive && (
                          <motion.div
                            layoutId="admin-active-indicator"
                            className="absolute left-0 h-6 w-0.5 rounded-r-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]"
                          />
                        )}

                        <span
                          className={`
                            relative z-10 flex shrink-0 items-center justify-center
                            transition-colors
                            ${isActive
                              ? "text-blue-400"
                              : "text-slate-500 group-hover:text-slate-300"
                            }
                          `}
                        >
                          {item.icon}
                        </span>

                        {isOpen && (
                          <>
                            <span className="relative z-10 min-w-0 flex-1 truncate">
                              {item.label}
                            </span>

                            {item.superAdminOnly && (
                              <span className="relative z-10 rounded-md border border-amber-400/10 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400">
                                SA
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom admin profile */}
      <div className="relative shrink-0 border-t border-white/[0.06] p-3">
        <div
          className={`
            flex items-center rounded-xl
            border border-white/[0.05]
            bg-white/[0.025]
            ${isOpen ? "gap-3 p-3" : "justify-center p-2"}
          `}
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-blue-500/10">
            {(identity?.email?.[0] ?? "A").toUpperCase()}

            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0D1422] bg-emerald-400" />
          </div>

          {isOpen && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {identity?.username ?? identity?.email ?? "Admin"}
              </p>

              <div className="mt-1 flex items-center gap-1.5">
                <Sparkles size={10} className="text-amber-400" />

                <span className="truncate text-[10px] font-medium uppercase tracking-wide text-amber-400">
                  {identity?.role?.replace("_", " ") ?? "ADMIN"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
