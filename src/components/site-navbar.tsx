"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import NotificationBell from "./notifications/NotificationBell";

interface NavEntry {
    href: string;
    label: string;
    index: string;
}

type Theme = "dark" | "light";

const NAV_LINKS: NavEntry[] = [
    { href: "/dashboard", label: "Dashboard", index: "01" },
    { href: "/code-academy", label: "Academy", index: "02" },
    { href: "/challenges", label: "Challenges", index: "03" },
    { href: "/talent-connect", label: "Talent Connect", index: "04" },
    { href: "/showcase", label: "Showcase", index: "05" },
    { href: "/leaderboard", label: "Leaderboard", index: "06" },
    { href: "/analytics", label: "Analytics", index: "07" },
];

const HIDDEN_ROUTES = new Set(["/", "/login", "/signup", "/code"]);

function isActive(pathname: string, href: string) {
    if (pathname === href) return true;
    return href !== "/dashboard" && pathname.startsWith(`${href}/`);
}

function Logo({ theme }: { theme: Theme }) {
    return (<Link
        href="/dashboard"
        aria-label="CodeRush home"
        className="group relative flex items-center gap-3"
    > <span className="pointer-events-none absolute -inset-5 rounded-3xl bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-400/10 opacity-0 blur-2xl transition duration-700 group-hover:opacity-100" />


        <span
            className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border transition-all duration-500 ${theme === "dark"
                ? "border-white/[0.12] bg-white/[0.055] shadow-[0_12px_40px_rgba(0,0,0,.5)]"
                : "border-slate-300 bg-white shadow-[0_12px_35px_rgba(15,23,42,.12)]"
                }`}
        >
            <span className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-violet-500/10 to-cyan-400/20 opacity-70" />

            <span className="absolute -left-10 top-0 h-full w-8 rotate-[20deg] bg-white/20 blur-md transition-all duration-700 group-hover:left-[120%]" />

            <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`relative transition duration-500 group-hover:scale-110 ${theme === "dark"
                    ? "text-white group-hover:text-cyan-300"
                    : "text-slate-800 group-hover:text-blue-600"
                    }`}
            >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        </span>

        <span className="relative hidden sm:block">
            <span
                className={`block text-[17px] font-black tracking-[-0.055em] ${theme === "dark" ? "text-white" : "text-slate-900"
                    }`}
            >
                Code
                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                    Rush
                </span>
            </span>

            <span
                className={`block text-[7px] font-bold uppercase tracking-[0.3em] ${theme === "dark"
                    ? "text-white/25"
                    : "text-slate-500"
                    }`}
            >
                Developer Platform
            </span>
        </span>
    </Link>
    );


}

function Avatar({
    avatarUrl,
    username,
    size = 34,
    theme,
}: {
    avatarUrl: string | null;
    username: string | null;
    size?: number;
    theme: Theme;
}) {
    const style = {
        width: size,
        height: size,
    };


    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt=""
                className={`rounded-full object-cover ${theme === "dark"
                    ? "border border-white/10"
                    : "border border-slate-300"
                    }`}
                style={style}
            />
        );
    }

    return (
        <span
            className="flex items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-blue-400 via-violet-500 to-cyan-400 text-xs font-black text-white shadow-[0_0_25px_rgba(59,130,246,.25)]"
            style={style}
        >
            {username?.[0]?.toUpperCase() ?? "?"}
        </span>
    );


}

export default function SiteNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useAuthActions();

    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [search, setSearch] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [theme, setTheme] = useState<Theme>("dark");
    const [themeReady, setThemeReady] = useState(false);

    const [mousePosition, setMousePosition] = useState({
        x: 50,
        y: 50,
    });

    const menuRef = useRef<HTMLDivElement>(null);
    const mobilePanelRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLElement>(null);

    const user = useQuery(api.users.currentUser);
    const identity = useQuery(api.roles.me);

    const isSuperAdmin = identity?.role === "SUPER_ADMIN";

    useEffect(() => {
        const saved = window.localStorage.getItem(
            "coderush-theme"
        ) as Theme | null;

        const selected: Theme =
            saved === "dark" || saved === "light"
                ? saved
                : window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light";

        queueMicrotask(() => {
            setTheme(selected);
            setThemeReady(true);
        });

        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(selected);
        document.documentElement.style.colorScheme = selected;
    }, []);

    function applyTheme(nextTheme: Theme) {
        setTheme(nextTheme);

        window.localStorage.setItem(
            "coderush-theme",
            nextTheme
        );

        document.documentElement.classList.remove("dark", "light");
        document.documentElement.classList.add(nextTheme);
        document.documentElement.style.colorScheme = nextTheme;
    }

    function toggleTheme() {
        applyTheme(theme === "dark" ? "light" : "dark");
    }

    useEffect(() => {
        function handleScroll() {
            setScrolled(window.scrollY > 15);
        }

        handleScroll();

        window.addEventListener("scroll", handleScroll, {
            passive: true,
        });

        return () =>
            window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        function handleMouseMove(event: MouseEvent) {
            if (!navRef.current) return;

            const rect =
                navRef.current.getBoundingClientRect();

            setMousePosition({
                x:
                    ((event.clientX - rect.left) /
                        rect.width) *
                    100,
                y:
                    ((event.clientY - rect.top) /
                        rect.height) *
                    100,
            });
        }

        window.addEventListener(
            "mousemove",
            handleMouseMove
        );

        return () =>
            window.removeEventListener(
                "mousemove",
                handleMouseMove
            );
    }, []);

    useEffect(() => {
        function pointerDown(event: PointerEvent) {
            const target = event.target as Node;

            if (
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setMenuOpen(false);
            }

            if (
                mobilePanelRef.current &&
                !mobilePanelRef.current.contains(target)
            ) {
                setMobileOpen(false);
            }
        }

        function keyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMenuOpen(false);
                setMobileOpen(false);
            }
        }

        document.addEventListener(
            "pointerdown",
            pointerDown
        );

        document.addEventListener(
            "keydown",
            keyDown
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                pointerDown
            );

            document.removeEventListener(
                "keydown",
                keyDown
            );
        };
    }, []);

    useEffect(() => {
        function handleSlash(event: KeyboardEvent) {
            if (
                event.key !== "/" ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target as HTMLElement;

            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA"
            ) {
                return;
            }

            const input =
                document.querySelector(
                    "#coderush-search"
                ) as HTMLInputElement | null;

            if (input) {
                event.preventDefault();
                input.focus();
            }
        }

        window.addEventListener(
            "keydown",
            handleSlash
        );

        return () =>
            window.removeEventListener(
                "keydown",
                handleSlash
            );
    }, []);

    if (HIDDEN_ROUTES.has(pathname)) {
        return null;
    }

    async function handleLogout() {
        setLoggingOut(true);
        setMenuOpen(false);
        setMobileOpen(false);

        try {
            await signOut();
            router.push("/login");
            router.refresh();
        } finally {
            setLoggingOut(false);
        }
    }

    function handleSearch(event: React.FormEvent) {
        event.preventDefault();

        setMenuOpen(false);
        setMobileOpen(false);

        const query = search.trim();

        router.push(
            query
                ? `/challenges?theme=${encodeURIComponent(query)}`
                : "/challenges"
        );
    }

    const username = user?.username ?? null;

    const profileHref = username
        ? `/u/${username}`
        : "/profile";

    const isDark = theme === "dark";

    return (
        <>
            <header
                ref={navRef}
                className={`sticky top-0 z-[100] transition-all duration-500 ${scrolled ? "py-2" : "py-3"
                    }`}
            >
                <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5 lg:px-7">
                    <div
                        className={`relative overflow-visible rounded-3xl border transition-all duration-500 ${isDark
                            ? "border-white/[0.08] bg-[#07090d]/90"
                            : "border-slate-200 bg-white/95"
                            } ${scrolled
                                ? isDark
                                    ? "shadow-[0_25px_100px_rgba(0,0,0,.55)]"
                                    : "shadow-[0_20px_70px_rgba(15,23,42,.14)]"
                                : isDark
                                    ? "shadow-[0_15px_70px_rgba(0,0,0,.35)]"
                                    : "shadow-[0_15px_60px_rgba(15,23,42,.10)]"
                            }`}
                        style={{
                            backdropFilter: "blur(30px)",
                            WebkitBackdropFilter: "blur(30px)",
                        }}
                    >
                        <div
                            className="pointer-events-none absolute inset-0 rounded-3xl"
                            style={{
                                background: `
                                radial-gradient(
                                    420px circle at ${mousePosition.x}% ${mousePosition.y}%,
                                    ${isDark
                                        ? "rgba(59,130,246,.08)"
                                        : "rgba(59,130,246,.10)"
                                    },
                                    transparent 65%
                                )
                            `,
                            }}
                        />

                        <div
                            className={`pointer-events-none absolute -left-20 top-0 h-32 w-56 rounded-full blur-3xl ${isDark
                                ? "bg-blue-500/[0.07]"
                                : "bg-blue-500/[0.10]"
                                }`}
                        />

                        <div
                            className={`pointer-events-none absolute left-1/2 top-0 h-24 w-64 -translate-x-1/2 rounded-full blur-3xl ${isDark
                                ? "bg-violet-500/[0.06]"
                                : "bg-violet-500/[0.08]"
                                }`}
                        />

                        <div
                            className={`pointer-events-none absolute -right-20 top-0 h-32 w-56 rounded-full blur-3xl ${isDark
                                ? "bg-cyan-400/[0.06]"
                                : "bg-cyan-400/[0.08]"
                                }`}
                        />

                        <div
                            className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${isDark
                                ? "from-transparent via-blue-400/40 to-transparent"
                                : "from-transparent via-blue-500/30 to-transparent"
                                }`}
                        />

                        <div className="relative flex h-[64px] items-center justify-between gap-3 px-3 sm:px-4">
                            <div className="flex shrink-0 items-center">
                                <Logo theme={theme} />
                            </div>

                            <nav
                                aria-label="Primary navigation"
                                className="hidden items-center gap-1 xl:flex"
                            >
                                {NAV_LINKS.map((link) => {
                                    const active = isActive(
                                        pathname,
                                        link.href
                                    );

                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            aria-current={
                                                active
                                                    ? "page"
                                                    : undefined
                                            }
                                            className={`group relative flex h-10 items-center gap-2 overflow-hidden rounded-xl px-3.5 text-[11px] font-semibold transition-all duration-300 ${active
                                                ? isDark
                                                    ? "border border-blue-400/10 bg-gradient-to-r from-blue-500/[0.13] via-violet-500/[0.10] to-cyan-400/[0.08] text-white shadow-[0_0_30px_rgba(59,130,246,.07)]"
                                                    : "border border-blue-200 bg-gradient-to-r from-blue-50 via-violet-50 to-cyan-50 text-slate-900 shadow-[0_8px_25px_rgba(59,130,246,.10)]"
                                                : isDark
                                                    ? "text-white/45 hover:bg-white/[0.04] hover:text-white/90"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                                }`}
                                        >
                                            {active && (
                                                <span
                                                    className={`absolute inset-x-3 bottom-0 h-px bg-gradient-to-r ${isDark
                                                        ? "from-blue-400 via-violet-400 to-cyan-300"
                                                        : "from-blue-500 via-violet-500 to-cyan-500"
                                                        }`}
                                                />
                                            )}

                                            <span
                                                className={`font-mono text-[7px] ${active
                                                    ? isDark
                                                        ? "text-blue-300/60"
                                                        : "text-blue-600"
                                                    : isDark
                                                        ? "text-white/10 group-hover:text-white/25"
                                                        : "text-slate-400 group-hover:text-slate-600"
                                                    }`}
                                            >
                                                {link.index}
                                            </span>

                                            <span className="relative">
                                                {link.label}
                                            </span>

                                            {active && (
                                                <span
                                                    className={`h-1 w-1 rounded-full ${isDark
                                                        ? "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.9)]"
                                                        : "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,.45)]"
                                                        }`}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="flex items-center gap-1.5">
                                <form
                                    onSubmit={handleSearch}
                                    className="hidden 2xl:block"
                                    role="search"
                                >
                                    <div className="group relative">
                                        <SearchIcon
                                            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition ${isDark
                                                ? "text-white/20 group-focus-within:text-blue-300/70"
                                                : "text-slate-400 group-focus-within:text-blue-500"
                                                }`}
                                        />

                                        <input
                                            id="coderush-search"
                                            type="search"
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Search challenges..."
                                            aria-label="Search challenges"
                                            className={`h-9 w-48 rounded-xl border pl-9 pr-12 text-[11px] outline-none transition-all placeholder:transition focus:w-56 ${isDark
                                                ? "border-white/[0.07] bg-white/[0.025] text-white placeholder:text-white/20 focus:border-blue-400/20 focus:bg-blue-500/[0.035]"
                                                : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
                                                }`}
                                        />

                                        <kbd
                                            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 font-mono text-[7px] ${isDark
                                                ? "border-white/[0.08] bg-white/[0.04] text-white/20"
                                                : "border-slate-200 bg-white text-slate-400"
                                                }`}
                                        >
                                            /
                                        </kbd>
                                    </div>
                                </form>

                                <Link
                                    href="/code"
                                    title="Code Editor"
                                    className={`group relative flex h-9 items-center gap-2 overflow-hidden rounded-xl border px-3 text-[10px] font-bold transition-all duration-300 ${isDark
                                        ? "border-blue-400/10 bg-gradient-to-r from-blue-500/[0.08] via-violet-500/[0.06] to-cyan-400/[0.05] text-white/65 hover:border-blue-400/25 hover:from-blue-500/[0.15] hover:via-violet-500/[0.12] hover:to-cyan-400/[0.10] hover:text-white"
                                        : "border-blue-200 bg-gradient-to-r from-blue-50 via-violet-50 to-cyan-50 text-slate-700 hover:border-blue-300 hover:from-blue-100 hover:via-violet-100 hover:to-cyan-100 hover:text-slate-950"
                                        }`}
                                >
                                    <span
                                        className={`flex h-5 w-5 items-center justify-center rounded-md transition ${isDark
                                            ? "bg-blue-400/[0.08] text-blue-300 group-hover:bg-blue-400/[0.16] group-hover:text-cyan-300"
                                            : "bg-blue-100 text-blue-600 group-hover:bg-blue-200 group-hover:text-cyan-600"
                                            }`}
                                    >
                                        <CodeIcon size={13} />
                                    </span>

                                    <span className="hidden lg:block">
                                        Editor
                                    </span>

                                    <ArrowIcon
                                        size={11}
                                        className="hidden opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-70 lg:block"
                                    />
                                </Link>

                                {themeReady && (
                                    <button
                                        type="button"
                                        onClick={toggleTheme}
                                        aria-label={
                                            isDark
                                                ? "Switch to light mode"
                                                : "Switch to dark mode"
                                        }
                                        className={`group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border transition-all duration-300 ${isDark
                                            ? "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-violet-400/20 hover:bg-violet-500/[0.06] hover:text-white"
                                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
                                            }`}
                                    >
                                        <span
                                            className={`absolute transition-all duration-500 ${!isDark
                                                ? "rotate-0 scale-100 opacity-100"
                                                : "rotate-90 scale-0 opacity-0"
                                                }`}
                                        >
                                            <SunIcon />
                                        </span>

                                        <span
                                            className={`absolute transition-all duration-500 ${isDark
                                                ? "rotate-0 scale-100 opacity-100"
                                                : "-rotate-90 scale-0 opacity-0"
                                                }`}
                                        >
                                            <MoonIcon />
                                        </span>
                                    </button>
                                )}

                                {user && (
                                    <div className="premium-notification">
                                        <NotificationBell />
                                    </div>
                                )}

                                <div
                                    ref={menuRef}
                                    className="relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMenuOpen(
                                                (open) => !open
                                            )
                                        }
                                        aria-haspopup="menu"
                                        aria-expanded={menuOpen}
                                        className={`group flex h-9 items-center gap-2 rounded-xl border py-1 pl-1 pr-2 transition-all duration-300 ${menuOpen
                                            ? isDark
                                                ? "border-blue-400/20 bg-blue-500/[0.09]"
                                                : "border-blue-300 bg-blue-50"
                                            : isDark
                                                ? "border-white/[0.07] bg-white/[0.025] hover:border-blue-400/15 hover:bg-white/[0.05]"
                                                : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
                                            }`}
                                    >
                                        <div className="relative">
                                            <Avatar
                                                avatarUrl={
                                                    user?.avatarUrl ??
                                                    null
                                                }
                                                username={username}
                                                size={27}
                                                theme={theme}
                                            />

                                            <span
                                                className={`absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border ${isDark
                                                    ? "border-[#07090d] bg-cyan-400"
                                                    : "border-white bg-cyan-500"
                                                    } shadow-[0_0_9px_rgba(34,211,238,.8)]`}
                                            />
                                        </div>

                                        <span
                                            className={`hidden max-w-[90px] truncate text-[10px] font-semibold sm:block ${isDark
                                                ? "text-white/60"
                                                : "text-slate-700"
                                                }`}
                                        >
                                            {username ?? "..."}
                                        </span>

                                        <ChevronIcon
                                            open={menuOpen}
                                            theme={theme}
                                        />
                                    </button>

                                    {menuOpen && (
                                        <UserMenu
                                            user={user}
                                            username={username}
                                            profileHref={profileHref}
                                            isSuperAdmin={isSuperAdmin}
                                            loggingOut={loggingOut}
                                            onClose={() =>
                                                setMenuOpen(false)
                                            }
                                            onLogout={handleLogout}
                                            theme={theme}
                                        />
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMobileOpen(
                                            (open) => !open
                                        )
                                    }
                                    aria-expanded={mobileOpen}
                                    aria-controls="mobile-navigation"
                                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition xl:hidden ${isDark
                                        ? "border-white/[0.07] bg-white/[0.025] text-white/50 hover:border-blue-400/20 hover:bg-blue-500/[0.06] hover:text-white"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                                        }`}
                                >
                                    {mobileOpen ? (
                                        <CloseIcon />
                                    ) : (
                                        <MenuIcon />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {mobileOpen && (
                        <div
                            ref={mobilePanelRef}
                            id="mobile-navigation"
                            className={`relative mt-2 overflow-hidden rounded-3xl border p-2 shadow-xl xl:hidden ${isDark
                                ? "border-white/[0.08] bg-[#07090d]/95 shadow-[0_30px_100px_rgba(0,0,0,.7)]"
                                : "border-slate-200 bg-white/95 shadow-[0_25px_80px_rgba(15,23,42,.15)]"
                                }`}
                            style={{
                                backdropFilter: "blur(30px)",
                                WebkitBackdropFilter:
                                    "blur(30px)",
                            }}
                        >
                            <div
                                className={`pointer-events-none absolute -left-20 top-0 h-32 w-48 rounded-full blur-3xl ${isDark
                                    ? "bg-blue-500/[0.08]"
                                    : "bg-blue-500/[0.10]"
                                    }`}
                            />

                            <div
                                className={`pointer-events-none absolute -right-20 top-0 h-32 w-48 rounded-full blur-3xl ${isDark
                                    ? "bg-violet-500/[0.08]"
                                    : "bg-violet-500/[0.10]"
                                    }`}
                            />

                            <div className="relative mb-2 flex items-center justify-between px-3 pb-2 pt-2">
                                <p
                                    className={`text-[8px] font-black uppercase tracking-[0.3em] ${isDark
                                        ? "text-white/25"
                                        : "text-slate-500"
                                        }`}
                                >
                                    Navigation
                                </p>

                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    className={`flex h-8 items-center gap-2 rounded-lg border px-2.5 transition ${isDark
                                        ? "border-white/[0.07] bg-white/[0.03] text-white/40 hover:bg-blue-500/[0.07] hover:text-white"
                                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                        }`}
                                >
                                    {isDark ? (
                                        <>
                                            <SunIcon size={13} />
                                            <span className="text-[9px] font-semibold">
                                                Light
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <MoonIcon size={13} />
                                            <span className="text-[9px] font-semibold">
                                                Dark
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <nav className="relative space-y-1">
                                {NAV_LINKS.map((link) => {
                                    const active = isActive(
                                        pathname,
                                        link.href
                                    );

                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() =>
                                                setMobileOpen(false)
                                            }
                                            className={`group flex h-12 items-center justify-between rounded-xl px-3 transition ${active
                                                ? isDark
                                                    ? "border border-blue-400/10 bg-gradient-to-r from-blue-500/[0.12] via-violet-500/[0.08] to-cyan-400/[0.06] text-white"
                                                    : "border border-blue-200 bg-gradient-to-r from-blue-50 via-violet-50 to-cyan-50 text-slate-900"
                                                : isDark
                                                    ? "text-white/40 hover:bg-white/[0.04] hover:text-white"
                                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <span
                                                    className={`font-mono text-[8px] ${isDark
                                                        ? "text-white/15"
                                                        : "text-slate-400"
                                                        }`}
                                                >
                                                    {link.index}
                                                </span>

                                                <span className="text-xs font-semibold">
                                                    {link.label}
                                                </span>
                                            </span>

                                            {active ? (
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${isDark
                                                        ? "bg-cyan-300"
                                                        : "bg-cyan-500"
                                                        }`}
                                                />
                                            ) : (
                                                <ArrowIcon
                                                    size={12}
                                                    className={`opacity-0 transition group-hover:translate-x-1 group-hover:opacity-50 ${isDark
                                                        ? "text-white"
                                                        : "text-slate-700"
                                                        }`}
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div
                                className={`relative my-2 h-px ${isDark
                                    ? "bg-white/[0.06]"
                                    : "bg-slate-200"
                                    }`}
                            />

                            <Link
                                href="/code"
                                onClick={() =>
                                    setMobileOpen(false)
                                }
                                className={`group relative flex h-12 items-center justify-between overflow-hidden rounded-xl border px-3 transition ${isDark
                                    ? "border-blue-400/10 bg-gradient-to-r from-blue-500/[0.09] via-violet-500/[0.07] to-cyan-400/[0.05] text-white/55 hover:text-white"
                                    : "border-blue-200 bg-gradient-to-r from-blue-50 via-violet-50 to-cyan-50 text-slate-700 hover:text-slate-950"
                                    }`}
                            >
                                <span className="flex items-center gap-3">
                                    <span
                                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDark
                                            ? "bg-blue-400/[0.08] text-blue-300"
                                            : "bg-blue-100 text-blue-600"
                                            }`}
                                    >
                                        <CodeIcon size={14} />
                                    </span>

                                    <span className="text-xs font-semibold">
                                        Open Code Editor
                                    </span>
                                </span>

                                <ArrowIcon size={13} />
                            </Link>

                            <MobileItem
                                href={profileHref}
                                icon={<UserIcon />}
                                label="View Profile"
                                onClick={() =>
                                    setMobileOpen(false)
                                }
                                theme={theme}
                            />

                            <MobileItem
                                href="/bookmarks"
                                icon={<BookmarkIcon />}
                                label="Bookmarks"
                                onClick={() =>
                                    setMobileOpen(false)
                                }
                                theme={theme}
                            />

                            {isSuperAdmin && (
                                <MobileItem
                                    href="/admin"
                                    icon={<ShieldIcon />}
                                    label="Super Admin Dashboard"
                                    onClick={() =>
                                        setMobileOpen(false)
                                    }
                                    theme={theme}
                                />
                            )}
                        </div>
                    )}
                </div>
            </header>

            <style jsx global>{`
            .premium-notification {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .premium-notification button {
                border-radius: 12px !important;
                transition:
                    transform 0.3s ease,
                    background 0.3s ease,
                    border-color 0.3s ease;
            }

            .premium-notification button:hover {
                transform: translateY(-1px);
            }

            html {
                transition:
                    background-color 0.4s ease,
                    color 0.4s ease;
            }

            html.dark {
                color-scheme: dark;
                background: #07090d;
            }

            html.light {
                color-scheme: light;
                background: #f5f7fb;
            }

            ::selection {
                background: rgba(96, 165, 250, 0.25);
                color: white;
            }

            ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }

            ::-webkit-scrollbar-track {
                background: transparent;
            }

            html.dark ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.08);
                border-radius: 999px;
            }

            html.light ::-webkit-scrollbar-thumb {
                background: rgba(15, 23, 42, 0.18);
                border-radius: 999px;
            }

            html.dark ::-webkit-scrollbar-thumb:hover {
                background: rgba(96, 165, 250, 0.25);
            }

            html.light ::-webkit-scrollbar-thumb:hover {
                background: rgba(59, 130, 246, 0.35);
            }

            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    scroll-behavior: auto !important;
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `}</style>
        </>
    );


}

function UserMenu({
    user,
    username,
    profileHref,
    isSuperAdmin,
    loggingOut,
    onClose,
    onLogout,
    theme,
}: {
    user:
    | {
        avatarUrl?: string | null;
        email?: string | null;
    }
    | null
    | undefined;
    username: string | null;
    profileHref: string;
    isSuperAdmin: boolean;
    loggingOut: boolean;
    onClose: () => void;
    onLogout: () => void;
    theme: Theme;
}) {
    const isDark = theme === "dark";


    return (
        <div
            role="menu"
            aria-label="User menu"
            className={`absolute right-0 top-[calc(100%+10px)] w-[290px] overflow-hidden rounded-3xl border p-2 shadow-2xl ${isDark
                ? "border-white/[0.09] bg-[#07090d]/95 shadow-[0_30px_110px_rgba(0,0,0,.75)]"
                : "border-slate-200 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,.16)]"
                }`}
            style={{
                backdropFilter: "blur(32px)",
                WebkitBackdropFilter: "blur(32px)",
            }}
        >
            <div
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${isDark
                    ? "bg-blue-500/[0.08]"
                    : "bg-blue-500/[0.10]"
                    }`}
            />

            <div
                className={`pointer-events-none absolute bottom-0 -left-10 h-24 w-24 rounded-full blur-3xl ${isDark
                    ? "bg-violet-500/[0.06]"
                    : "bg-violet-500/[0.08]"
                    }`}
            />

            <div
                className={`pointer-events-none absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r ${isDark
                    ? "from-transparent via-blue-400/50 to-transparent"
                    : "from-transparent via-blue-500/40 to-transparent"
                    }`}
            />

            <div
                className={`relative mb-1 overflow-hidden rounded-2xl border p-3 ${isDark
                    ? "border-white/[0.06] bg-gradient-to-br from-blue-500/[0.07] via-violet-500/[0.04] to-transparent"
                    : "border-slate-200 bg-gradient-to-br from-blue-50 via-violet-50 to-white"
                    }`}
            >
                <div className="relative flex items-center gap-3">
                    <div className="relative">
                        <Avatar
                            avatarUrl={user?.avatarUrl ?? null}
                            username={username}
                            size={42}
                            theme={theme}
                        />

                        <span
                            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 ${isDark
                                ? "border-[#07090d]"
                                : "border-white"
                                } bg-cyan-500`}
                        />
                    </div>

                    <div className="min-w-0">
                        <p
                            className={`truncate text-sm font-bold ${isDark
                                ? "text-white"
                                : "text-slate-900"
                                }`}
                        >
                            {username ?? "Your account"}
                        </p>

                        <p
                            className={`mt-0.5 truncate text-[10px] ${isDark
                                ? "text-white/25"
                                : "text-slate-500"
                                }`}
                        >
                            {user?.email ?? "Signed in"}
                        </p>
                    </div>
                </div>

                <div
                    className={`mt-3 flex items-center justify-between border-t pt-2.5 ${isDark
                        ? "border-white/[0.05]"
                        : "border-slate-200"
                        }`}
                >
                    <span
                        className={`text-[7px] font-bold uppercase tracking-[0.25em] ${isDark
                            ? "text-white/20"
                            : "text-slate-400"
                            }`}
                    >
                        Account Status
                    </span>

                    <span
                        className={`flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.15em] ${isDark
                            ? "text-cyan-300/70"
                            : "text-cyan-600"
                            }`}
                    >
                        <span className="h-1 w-1 rounded-full bg-cyan-500" />
                        Active
                    </span>
                </div>
            </div>

            <MenuItem
                href={profileHref}
                icon={<UserIcon />}
                label="View Profile"
                onClick={onClose}
                theme={theme}
            />

            <MenuItem
                href="/profile"
                icon={<EditIcon />}
                label="Edit Profile"
                onClick={onClose}
                theme={theme}
            />

            {isSuperAdmin && (
                <MenuItem
                    href="/admin"
                    icon={<ShieldIcon />}
                    label="Super Admin Dashboard"
                    badge="ADMIN"
                    onClick={onClose}
                    theme={theme}
                />
            )}

            <div
                className={`my-1.5 h-px ${isDark
                    ? "bg-white/[0.06]"
                    : "bg-slate-200"
                    }`}
            />

            <MenuItem
                href="/leaderboard"
                icon={<TrophyIcon />}
                label="Leaderboard"
                onClick={onClose}
                theme={theme}
            />

            <MenuItem
                href="/analytics"
                icon={<ChartIcon />}
                label="Analytics"
                onClick={onClose}
                theme={theme}
            />

            <MenuItem
                href="/bookmarks"
                icon={<BookmarkIcon />}
                label="Bookmarks"
                onClick={onClose}
                theme={theme}
            />

            <MenuItem
                href="/code"
                icon={<CodeIcon />}
                label="Code Editor"
                onClick={onClose}
                theme={theme}
            />

            <div
                className={`my-1.5 h-px ${isDark
                    ? "bg-white/[0.06]"
                    : "bg-slate-200"
                    }`}
            />

            <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                disabled={loggingOut}
                className={`group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[11px] font-semibold transition ${isDark
                    ? "text-red-400/60 hover:bg-red-400/[0.06] hover:text-red-400"
                    : "text-red-500 hover:bg-red-50 hover:text-red-600"
                    } disabled:opacity-50`}
            >
                <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDark
                        ? "bg-red-400/[0.05]"
                        : "bg-red-50"
                        }`}
                >
                    <LogoutIcon />
                </span>

                {loggingOut
                    ? "Logging out..."
                    : "Logout"}
            </button>

            <div className="px-3 pb-1 pt-3 text-center">
                <span
                    className={`font-mono text-[7px] uppercase tracking-[0.25em] ${isDark
                        ? "text-white/10"
                        : "text-slate-400"
                        }`}
                >
                    CodeRush Developer OS
                </span>
            </div>
        </div>
    );


}

function MenuItem({
    href,
    icon,
    label,
    badge,
    onClick,
    theme,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: string;
    onClick: () => void;
    theme: Theme;
}) {
    const isDark = theme === "dark";


    return (
        <Link
            role="menuitem"
            href={href}
            onClick={onClick}
            className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-semibold transition-all duration-200 ${isDark
                ? "text-white/40 hover:bg-blue-500/[0.06] hover:text-white"
                : "text-slate-600 hover:bg-blue-50 hover:text-slate-950"
                }`}
        >
            <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${isDark
                    ? "bg-white/[0.025] text-white/25 group-hover:bg-blue-400/[0.08] group-hover:text-blue-300"
                    : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600"
                    }`}
            >
                {icon}
            </span>

            <span className="flex-1">{label}</span>

            {badge && (
                <span
                    className={`rounded-md border px-1.5 py-0.5 text-[6px] font-black tracking-[0.15em] ${isDark
                        ? "border-blue-400/10 bg-blue-400/[0.06] text-blue-300/50"
                        : "border-blue-200 bg-blue-50 text-blue-600"
                        }`}
                >
                    {badge}
                </span>
            )}

            <ArrowIcon
                size={11}
                className={`opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-40 ${isDark
                    ? "text-white"
                    : "text-slate-700"
                    }`}
            />
        </Link>
    );


}

function MobileItem({
    href,
    icon,
    label,
    onClick,
    theme,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    theme: Theme;
}) {
    const isDark = theme === "dark";


    return (
        <Link
            href={href}
            onClick={onClick}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 transition ${isDark
                ? "text-white/35 hover:bg-white/[0.04] hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
        >
            {icon}

            <span className="text-xs font-semibold">
                {label}
            </span>
        </Link>
    );


}

function SearchIcon({
    className = "",
}: {
    className?: string;
}) {
    return (<svg
        className={className}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <circle cx="11" cy="11" r="7" /> <path d="m20 20-4-4" /> </svg>
    );
}

function CodeIcon({
    size = 16,
}: {
    size?: number;
}) {
    return (<svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <polyline points="16 18 22 12 16 6" /> <polyline points="8 6 2 12 8 18" /> </svg>
    );
}

function UserIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /> <circle cx="12" cy="7" r="4" /> </svg>
    );
}

function EditIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M12 20h9" /> <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /> </svg>
    );
}

function ShieldIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7Z" /> <path d="m9 12 2 2 4-4" /> </svg>
    );
}

function TrophyIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M6 4H4a2 2 0 0 0 0 4h2" /> <path d="M18 4h2a2 2 0 0 1 0 4h-2" /> <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" /> <path d="M12 15v4" /> <path d="M8 22h8" /> <path d="M9 19h6" /> </svg>
    );
}

function ChartIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M4 19V5" /> <path d="M4 19h17" /> <path d="m7 15 4-4 3 2 5-7" /> </svg>
    );
}

function BookmarkIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" /> </svg>
    );
}

function LogoutIcon() {
    return (<svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /> <polyline points="16 17 21 12 16 7" /> <line x1="21" y1="12" x2="9" y2="12" /> </svg>
    );
}

function ArrowIcon({
    size = 14,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (<svg
        width={size}
        height={size}
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <line x1="5" y1="12" x2="19" y2="12" /> <polyline points="12 5 19 12 12 19" /> </svg>
    );
}

function ChevronIcon({
    open,
    theme,
}: {
    open: boolean;
    theme: Theme;
}) {
    return (
        <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${open ? "rotate-180" : ""
                } ${theme === "dark"
                    ? "text-white/20"
                    : "text-slate-400"
                }`}
        > <polyline points="6 9 12 15 18 9" /> </svg>
    );
}

function MenuIcon() {
    return (<svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
    > <line x1="4" y1="7" x2="20" y2="7" /> <line x1="4" y1="12" x2="20" y2="12" /> <line x1="4" y1="17" x2="20" y2="17" /> </svg>
    );
}

function CloseIcon() {
    return (<svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
    > <line x1="18" y1="6" x2="6" y2="18" /> <line x1="6" y1="6" x2="18" y2="18" /> </svg>
    );
}

function SunIcon({
    size = 15,
}: {
    size?: number;
}) {
    return (<svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <circle cx="12" cy="12" r="4" /> <line x1="12" y1="2" x2="12" y2="4" /> <line x1="12" y1="20" x2="12" y2="22" /> <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /> <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" /> <line x1="2" y1="12" x2="4" y2="12" /> <line x1="20" y1="12" x2="22" y2="12" /> <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /> <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" /> </svg>
    );
}

function MoonIcon({
    size = 15,
}: {
    size?: number;
}) {
    return (<svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    > <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /> </svg>
    );
}
