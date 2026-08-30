"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  Settings,
  ChevronDown,
  ShieldCheck,
  CheckCheck,
  X,
  LayoutDashboard,
  Crown,
} from "lucide-react";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const { signOut } = useAuthActions();
  const router = useRouter();

  const identity = useQuery(api.roles.me);
  const unreadCount = useQuery(api.notifications.unreadCount);

  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /*
  
  * Role is resolved by the Convex backend.
  *
  * Expected values:
  * ADMIN
  * SUPER_ADMIN
    */
  const role = identity?.role ?? "ADMIN";

  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAdmin = role === "ADMIN" || isSuperAdmin;

  const displayName =
    identity?.username ??
    identity?.email?.split("@")[0] ??
    (isSuperAdmin ? "Super Admin" : "Admin");

  const avatarLetter = (
    identity?.username?.[0] ??
    identity?.email?.[0] ??
    (isSuperAdmin ? "S" : "A")
  ).toUpperCase();

  /*
  
  * Prevent accidental use of the admin header for a normal user.
  * AdminGuard should already protect this layout, but this provides
  * another safe client-side UI check.
    */
  if (!isAdmin) {
    return null;
  }

  return (<header className="relative z-40 flex h-[72px] shrink-0 items-center border-b border-white/[0.06] bg-[#0A101C]/85 px-3 backdrop-blur-2xl sm:px-4 lg:px-6">
    {/* =========================================================
LEFT SIDE
========================================================== */}

    <div className="flex min-w-0 flex-1 items-center gap-3">
      {/* Sidebar Toggle */}
      <button
        onClick={onMenuToggle}
        aria-label="Toggle admin navigation"
        className="
        flex h-10 w-10 shrink-0 items-center justify-center
        rounded-xl border border-white/[0.06]
        bg-white/[0.025]
        text-slate-400
        transition-all
        hover:border-white/[0.1]
        hover:bg-white/[0.06]
        hover:text-white
        active:scale-95
      "
      >
        <Menu size={19} />
      </button>

      {/* Desktop Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
        />

        <input
          type="text"
          placeholder="Search anything..."
          className="
          h-10 w-full rounded-xl
          border border-white/[0.06]
          bg-white/[0.025]
          pl-10 pr-14
          text-sm text-white
          outline-none
          placeholder:text-slate-600
          transition
          focus:border-blue-500/30
          focus:bg-white/[0.04]
          focus:ring-2
          focus:ring-blue-500/10
        "
        />

        <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-1 text-[10px] text-slate-600 lg:flex">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>
    </div>

    {/* =========================================================
      RIGHT SIDE
  ========================================================== */}

    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {/* Theme */}
      <button
        onClick={() => setDarkMode((prev) => !prev)}
        className="
        hidden h-10 w-10 items-center justify-center
        rounded-xl border border-white/[0.06]
        bg-white/[0.025]
        text-slate-400
        transition
        hover:bg-white/[0.06]
        hover:text-white
        sm:flex
      "
        aria-label="Toggle theme"
      >
        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* =====================================================
        NOTIFICATIONS
    ====================================================== */}

      <div className="relative" ref={notificationRef}>
        <button
          onClick={() => {
            setShowNotifications((prev) => !prev);
            setShowProfile(false);
          }}
          className="
          relative flex h-10 w-10 items-center justify-center
          rounded-xl border border-white/[0.06]
          bg-white/[0.025]
          text-slate-400
          transition
          hover:bg-white/[0.06]
          hover:text-white
        "
          aria-label="Notifications"
          aria-expanded={showNotifications}
        >
          <Bell size={17} />

          {typeof unreadCount === "number" && unreadCount > 0 && (
            <span className="
            absolute right-2 top-2
            flex h-4 min-w-4 items-center justify-center
            rounded-full bg-blue-500 px-1
            text-[9px] font-bold text-white
            shadow-[0_0_10px_rgba(59,130,246,0.7)]
          ">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="
              absolute right-0 top-12
              w-[min(360px,calc(100vw-24px))]
              overflow-hidden rounded-2xl
              border border-white/[0.08]
              bg-[#111827]/95
              shadow-2xl
              backdrop-blur-2xl
            "
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Notifications
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Stay updated with CodeRush
                  </p>
                </div>

                <button
                  onClick={() => setShowNotifications(false)}
                  className="
                  flex h-7 w-7 items-center justify-center
                  rounded-lg text-slate-500
                  hover:bg-white/[0.06]
                  hover:text-white
                "
                  aria-label="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-4 py-8 text-center">
                <div className="
                mx-auto mb-3 flex h-11 w-11
                items-center justify-center
                rounded-full bg-blue-500/10
              ">
                  <CheckCheck
                    size={20}
                    className="text-blue-400"
                  />
                </div>

                <p className="text-sm font-medium text-slate-300">
                  {unreadCount
                    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"
                    }`
                    : "You're all caught up"}
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  No notification preview available here.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="mx-1 hidden h-7 w-px bg-white/[0.07] sm:block" />

      {/* =====================================================
        SUPER ADMIN / ADMIN ACCOUNT
    ====================================================== */}

      <div className="relative" ref={profileRef}>
        <button
          onClick={() => {
            setShowProfile((prev) => !prev);
            setShowNotifications(false);
          }}
          className="
          flex items-center gap-2
          rounded-xl
          border border-white/[0.06]
          bg-white/[0.025]
          p-1.5 pr-2.5
          transition-all
          hover:border-white/[0.12]
          hover:bg-white/[0.05]
          active:scale-[0.98]
        "
          aria-label="Open account menu"
          aria-haspopup="menu"
          aria-expanded={showProfile}
        >
          {/* Avatar */}
          <div
            className={`
            flex h-8 w-8 items-center justify-center
            rounded-lg
            text-xs font-bold text-white
            shadow-lg
            ${isSuperAdmin
                ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 shadow-orange-500/20"
                : "bg-gradient-to-br from-blue-500 to-violet-600 shadow-blue-500/20"
              }
          `}
          >
            {avatarLetter}
          </div>

          {/* Name + Role */}
          <div className="hidden min-w-0 text-left lg:block">
            <p className="max-w-[130px] truncate text-xs font-semibold text-white">
              {displayName}
            </p>

            <div className="flex items-center gap-1">
              {isSuperAdmin ? (
                <Crown
                  size={10}
                  className="text-amber-400"
                />
              ) : (
                <ShieldCheck
                  size={10}
                  className="text-blue-400"
                />
              )}

              <span
                className={`
                text-[9px] font-semibold
                uppercase tracking-wide
                ${isSuperAdmin
                    ? "text-amber-400"
                    : "text-blue-400"
                  }
              `}
              >
                {role.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <ChevronDown
            size={14}
            className={`
            hidden text-slate-500
            transition-transform
            lg:block
            ${showProfile ? "rotate-180" : ""}
          `}
          />
        </button>

        {/* =================================================
          ACCOUNT DROPDOWN
      ================================================== */}

        <AnimatePresence>
          {showProfile && (
            <motion.div
              initial={{
                opacity: 0,
                y: 8,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.97,
              }}
              transition={{
                duration: 0.16,
              }}
              role="menu"
              className="
              absolute right-0 top-12
              w-[min(300px,calc(100vw-24px))]
              overflow-hidden
              rounded-2xl
              border border-white/[0.08]
              bg-[#111827]/95
              shadow-[0_20px_70px_rgba(0,0,0,0.45)]
              backdrop-blur-2xl
            "
            >
              {/* Account Information */}
              <div
                className={`
                border-b border-white/[0.06]
                p-4
                ${isSuperAdmin
                    ? "bg-gradient-to-br from-amber-500/[0.08] to-transparent"
                    : "bg-gradient-to-br from-blue-500/[0.06] to-transparent"
                  }
              `}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`
                    flex h-11 w-11 shrink-0
                    items-center justify-center
                    rounded-xl
                    text-sm font-bold text-white
                    ${isSuperAdmin
                        ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500"
                        : "bg-gradient-to-br from-blue-500 to-violet-600"
                      }
                  `}
                  >
                    {avatarLetter}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {identity?.email ?? "Loading..."}
                    </p>

                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-1">
                      {isSuperAdmin ? (
                        <Crown
                          size={11}
                          className="text-amber-400"
                        />
                      ) : (
                        <ShieldCheck
                          size={11}
                          className="text-blue-400"
                        />
                      )}

                      <span
                        className={`
                        text-[9px] font-bold
                        uppercase tracking-[0.08em]
                        ${isSuperAdmin
                            ? "text-amber-400"
                            : "text-blue-400"
                          }
                      `}
                      >
                        {role.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className="p-2">
                {/* Profile */}
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/profile");
                  }}
                  className="
                  flex w-full items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-sm text-slate-400
                  transition
                  hover:bg-white/[0.05]
                  hover:text-white
                "
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>

                {/* Settings */}
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowProfile(false);
                    router.push("/admin/settings");
                  }}
                  className="
                  flex w-full items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-sm text-slate-400
                  transition
                  hover:bg-white/[0.05]
                  hover:text-white
                "
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>

                {/* =================================================
                  SUPER ADMIN DASHBOARD
              ================================================== */}

                {isSuperAdmin && (
                  <>
                    <div className="my-2 border-t border-white/[0.06]" />

                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowProfile(false);
                        router.push("/admin");
                      }}
                      className="
                      group flex w-full items-center gap-3
                      rounded-xl
                      border border-amber-400/10
                      bg-gradient-to-r
                      from-amber-500/[0.08]
                      to-orange-500/[0.04]
                      px-3 py-3
                      text-sm
                      text-amber-300
                      transition-all
                      hover:border-amber-400/20
                      hover:from-amber-500/[0.14]
                      hover:to-orange-500/[0.08]
                    "
                    >
                      <span className="
                      flex h-8 w-8
                      items-center justify-center
                      rounded-lg
                      bg-amber-400/10
                      text-amber-400
                      transition
                      group-hover:bg-amber-400/15
                    ">
                        <Crown size={16} />
                      </span>

                      <span className="flex-1 text-left">
                        <span className="block font-semibold">
                          Super Admin Dashboard
                        </span>

                        <span className="mt-0.5 block text-[10px] text-amber-400/60">
                          Full platform control
                        </span>
                      </span>

                      <LayoutDashboard
                        size={15}
                        className="text-amber-400/50 transition group-hover:text-amber-400"
                      />
                    </button>
                  </>
                )}

                {/* Admin Dashboard */}
                {isAdmin && !isSuperAdmin && (
                  <>
                    <div className="my-2 border-t border-white/[0.06]" />

                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowProfile(false);
                        router.push("/admin");
                      }}
                      className="
                      flex w-full items-center gap-3
                      rounded-xl px-3 py-2.5
                      text-sm text-slate-400
                      transition
                      hover:bg-white/[0.05]
                      hover:text-white
                    "
                    >
                      <LayoutDashboard size={16} />
                      <span>Admin Dashboard</span>
                    </button>
                  </>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-white/[0.06] p-2">
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="
                  flex w-full items-center gap-3
                  rounded-xl px-3 py-2.5
                  text-sm text-red-400
                  transition
                  hover:bg-red-500/10
                  hover:text-red-300
                "
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  </header>

  );
}
