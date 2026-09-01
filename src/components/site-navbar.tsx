
"use client";

/**
 * CodeRush — Ultra Premium Global Navbar
 *
 * FEATURES
 * ─────────────────────────────────────────────────────────────
 * • Premium black glass navbar
 * • Premium CodeRush logo
 * • Dark / Light mode toggle
 * • Persistent theme using localStorage
 * • System theme detection
 * • Animated theme transition
 * • Cursor-reactive ambient lighting
 * • Animated active navigation
 * • Search
 * • Code Editor shortcut
 * • Notifications
 * • Premium user menu
 * • SUPER_ADMIN support
 * • Click outside handling
 * • Escape key handling
 * • Responsive mobile navigation
 * • Existing Convex/auth logic preserved
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import NotificationBell from "./notifications/NotificationBell";

/* ================================================================
   TYPES
================================================================ */

interface NavEntry {
    href: string;
    label: string;
    index: string;
}

type Theme = "dark" | "light";

/* ================================================================
   NAVIGATION
================================================================ */

const NAV_LINKS: NavEntry[] = [
    {
        href: "/dashboard",
        label: "Dashboard",
        index: "01",
    },
    {
        href: "/challenges",
        label: "Challenges",
        index: "02",
    },
    {
        href: "/showcase",
        label: "Showcase",
        index: "03",
    },
    {
        href: "/leaderboard",
        label: "Leaderboard",
        index: "04",
    },
    {
        href: "/analytics",
        label: "Analytics",
        index: "05",
    },
];

/* ================================================================
   ROUTES WITHOUT NAVBAR
================================================================ */

const HIDDEN_ROUTES = new Set([
    "/",
    "/login",
    "/signup",
    "/code",
]);

/* ================================================================
   ACTIVE ROUTE
================================================================ */

function isActive(
    pathname: string,
    href: string
): boolean {
    if (pathname === href) return true;

    return (
        href !== "/dashboard" &&
        pathname.startsWith(`${href}/`)
    );
}

/* ================================================================
   LOGO
================================================================ */

function Logo({
    theme,
}: {
    theme: Theme;
}) {
    return (
        <Link
            href="/dashboard"
            aria-label="CodeRush home"
            className="group relative flex items-center gap-3"
        >
            {/* Ambient glow */}

            <span
                className={`pointer-events-none absolute -inset-4 rounded-2xl blur-2xl transition-all duration-700 ${theme === "dark"
                        ? "bg-white/[0.025] opacity-0 group-hover:opacity-100"
                        : "bg-black/[0.04] opacity-0 group-hover:opacity-100"
                    }`}
            />

            {/* Logo Mark */}

            <span
                className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[13px] border transition-all duration-500 ${theme === "dark"
                        ? "border-white/[0.13] bg-white/[0.055] shadow-[0_10px_35px_rgba(0,0,0,.45)] group-hover:border-white/25 group-hover:bg-white/[0.09]"
                        : "border-white/20 bg-white/10 shadow-[0_10px_35px_rgba(0,0,0,.25)] group-hover:border-white/40 group-hover:bg-white/20"
                    }`}
            >
                {/* Inner reflection */}

                <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.16] via-transparent to-transparent" />

                {/* Animated shine */}

                <span className="pointer-events-none absolute -left-10 top-0 h-full w-8 rotate-[20deg] bg-white/[0.12] blur-md transition-all duration-700 group-hover:left-[120%]" />

                {/* Code icon */}

                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="relative text-white transition-all duration-500 group-hover:scale-110"
                    aria-hidden="true"
                >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                </svg>
            </span>

            {/* Wordmark */}

            <span className="relative hidden sm:block">
                <span
                    className={`block text-[17px] font-black tracking-[-0.055em] transition-colors duration-300 ${theme === "dark"
                            ? "text-white"
                            : "text-white"
                        }`}
                >
                    Code
                    <span className="text-white/35">
                        Rush
                    </span>
                </span>

                <span className="block text-[7px] font-bold uppercase tracking-[0.3em] text-white/25">
                    Developer Platform
                </span>
            </span>
        </Link>
    );
}

/* ================================================================
   AVATAR
================================================================ */

function Avatar({
    avatarUrl,
    username,
    size = 34,
}: {
    avatarUrl: string | null;
    username: string | null;
    size?: number;
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
                className="rounded-full border border-white/[0.12] object-cover"
                style={style}
                onError={(event) => {
                    event.currentTarget.style.display =
                        "none";
                }}
            />
        );
    }

    return (
        <span
            className="flex items-center justify-center rounded-full border border-white/[0.15] bg-gradient-to-br from-white via-white/80 to-white/20 text-xs font-black text-black shadow-[0_0_25px_rgba(255,255,255,.08)]"
            style={style}
        >
            {username?.[0]?.toUpperCase() ?? "?"}
        </span>
    );
}

/* ================================================================
   MAIN NAVBAR
================================================================ */

export default function SiteNavbar() {
    const pathname = usePathname();
    const router = useRouter();

    const { signOut } = useAuthActions();

    /* ============================================================
       STATE
    ============================================================ */

    const [menuOpen, setMenuOpen] =
        useState(false);

    const [mobileOpen, setMobileOpen] =
        useState(false);

    const [loggingOut, setLoggingOut] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [scrolled, setScrolled] =
        useState(false);

    const [theme, setTheme] =
        useState<Theme>("dark");

    const [themeReady, setThemeReady] =
        useState(false);

    const [mousePosition, setMousePosition] =
        useState({
            x: 50,
            y: 50,
        });

    /* ============================================================
       REFS
    ============================================================ */

    const menuRef =
        useRef<HTMLDivElement>(null);

    const mobilePanelRef =
        useRef<HTMLDivElement>(null);

    const navRef =
        useRef<HTMLElement>(null);

    /* ============================================================
       CONVEX
    ============================================================ */

    const user = useQuery(
        api.users.currentUser
    );

    const identity = useQuery(
        api.roles.me
    );

    const isSuperAdmin =
        identity?.role === "SUPER_ADMIN";

    /* ============================================================
       THEME
    ============================================================ */

    useEffect(() => {
        const savedTheme =
            window.localStorage.getItem(
                "coderush-theme"
            ) as Theme | null;

        let selectedTheme: Theme;

        if (
            savedTheme === "dark" ||
            savedTheme === "light"
        ) {
            selectedTheme = savedTheme;
        } else {
            selectedTheme =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
                    ? "dark"
                    : "light";
        }

        setTheme(selectedTheme);

        document.documentElement.classList.remove(
            "dark",
            "light"
        );

        document.documentElement.classList.add(
            selectedTheme
        );

        document.documentElement.style.colorScheme =
            selectedTheme;

        setThemeReady(true);
    }, []);

    function applyTheme(
        nextTheme: Theme
    ) {
        setTheme(nextTheme);

        window.localStorage.setItem(
            "coderush-theme",
            nextTheme
        );

        document.documentElement.classList.remove(
            "dark",
            "light"
        );

        document.documentElement.classList.add(
            nextTheme
        );

        document.documentElement.style.colorScheme =
            nextTheme;
    }

    function toggleTheme() {
        applyTheme(
            theme === "dark"
                ? "light"
                : "dark"
        );
    }

    /* ============================================================
       SCROLL
    ============================================================ */

    useEffect(() => {
        function handleScroll() {
            setScrolled(
                window.scrollY > 12
            );
        }

        handleScroll();

        window.addEventListener(
            "scroll",
            handleScroll,
            {
                passive: true,
            }
        );

        return () =>
            window.removeEventListener(
                "scroll",
                handleScroll
            );
    }, []);

    /* ============================================================
       CURSOR LIGHT
    ============================================================ */

    useEffect(() => {
        function handleMouseMove(
            event: MouseEvent
        ) {
            if (!navRef.current) return;

            const rect =
                navRef.current.getBoundingClientRect();

            setMousePosition({
                x:
                    ((event.clientX -
                        rect.left) /
                        rect.width) *
                    100,

                y:
                    ((event.clientY -
                        rect.top) /
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

    /* ============================================================
       OUTSIDE CLICK + ESCAPE
    ============================================================ */

    useEffect(() => {
        function onPointerDown(
            event: PointerEvent
        ) {
            const target =
                event.target as Node;

            if (
                menuRef.current &&
                !menuRef.current.contains(
                    target
                )
            ) {
                setMenuOpen(false);
            }

            if (
                mobilePanelRef.current &&
                !mobilePanelRef.current.contains(
                    target
                )
            ) {
                setMobileOpen(false);
            }
        }

        function onKeyDown(
            event: KeyboardEvent
        ) {
            if (event.key === "Escape") {
                setMenuOpen(false);
                setMobileOpen(false);
            }
        }

        document.addEventListener(
            "pointerdown",
            onPointerDown
        );

        document.addEventListener(
            "keydown",
            onKeyDown
        );

        return () => {
            document.removeEventListener(
                "pointerdown",
                onPointerDown
            );

            document.removeEventListener(
                "keydown",
                onKeyDown
            );
        };
    }, []);

    /* ============================================================
       KEYBOARD SEARCH
    ============================================================ */

    useEffect(() => {
        function handleSlash(
            event: KeyboardEvent
        ) {
            if (
                event.key !== "/" ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
            ) {
                return;
            }

            const target =
                event.target as HTMLElement;

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

    /* ============================================================
       HIDDEN ROUTES
    ============================================================ */

    if (HIDDEN_ROUTES.has(pathname)) {
        return null;
    }

    /* ============================================================
       LOGOUT
    ============================================================ */

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

    /* ============================================================
       SEARCH
    ============================================================ */

    function handleSearch(
        event: React.FormEvent
    ) {
        event.preventDefault();

        setMenuOpen(false);
        setMobileOpen(false);

        const query =
            search.trim();

        router.push(
            query
                ? `/challenges?theme=${encodeURIComponent(
                    query
                )}`
                : "/challenges"
        );
    }

    /* ============================================================
       USER
    ============================================================ */

    const username =
        user?.username ?? null;

    const profileHref = username
        ? `/u/${username}`
        : "/profile";

    /* ============================================================
       RENDER
    ============================================================ */

    return (
        <>
            <header
                ref={navRef}
                className={`sticky top-0 z-[100] transition-all duration-500 ${scrolled
                        ? "py-2"
                        : "py-3"
                    }`}
            >
                <div className="mx-auto w-full max-w-[1500px] px-3 sm:px-5 lg:px-7">

                    {/* =================================================
                        PREMIUM BLACK NAV CONTAINER
                    ================================================= */}

                    <div
                        className={`relative overflow-visible rounded-2xl border transition-all duration-500 ${scrolled
                                ? "border-white/[0.13] bg-black shadow-[0_20px_80px_rgba(0,0,0,.65)]"
                                : "border-white/[0.09] bg-black shadow-[0_12px_50px_rgba(0,0,0,.45)]"
                            }`}
                        style={{
                            backdropFilter:
                                "blur(26px)",
                            WebkitBackdropFilter:
                                "blur(26px)",
                        }}
                    >

                        {/* =================================================
                            CURSOR AMBIENT LIGHT
                        ================================================= */}

                        <div
                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-100"
                            style={{
                                background: `
                                    radial-gradient(
                                        420px circle at ${mousePosition.x}% ${mousePosition.y}%,
                                        rgba(255,255,255,0.055),
                                        transparent 65%
                                    )
                                `,
                            }}
                        />

                        {/* =================================================
                            TOP REFLECTION
                        ================================================= */}

                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.22] to-transparent" />

                        {/* =================================================
                            BOTTOM HAIRLINE
                        ================================================= */}

                        <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                        {/* =================================================
                            NAV CONTENT
                        ================================================= */}

                        <div className="relative flex h-[62px] items-center justify-between gap-3 px-3 sm:px-4">

                            {/* =================================================
                                LEFT
                            ================================================= */}

                            <div className="flex shrink-0 items-center">
                                <Logo theme={theme} />
                            </div>

                            {/* =================================================
                                DESKTOP NAV
                            ================================================= */}

                            <nav
                                aria-label="Primary navigation"
                                className="hidden items-center gap-1 xl:flex"
                            >
                                {NAV_LINKS.map(
                                    (link) => {
                                        const active =
                                            isActive(
                                                pathname,
                                                link.href
                                            );

                                        return (
                                            <Link
                                                key={
                                                    link.href
                                                }
                                                href={
                                                    link.href
                                                }
                                                aria-current={
                                                    active
                                                        ? "page"
                                                        : undefined
                                                }
                                                className={`group relative flex h-10 items-center gap-2 rounded-xl px-3.5 text-[11px] font-semibold transition-all duration-300 ${active
                                                        ? "bg-white/[0.075] text-white"
                                                        : "text-white/35 hover:bg-white/[0.04] hover:text-white/85"
                                                    }`}
                                            >
                                                {/* Index */}

                                                <span
                                                    className={`font-mono text-[7px] transition-colors ${active
                                                            ? "text-white/35"
                                                            : "text-white/10 group-hover:text-white/25"
                                                        }`}
                                                >
                                                    {
                                                        link.index
                                                    }
                                                </span>

                                                {link.label}

                                                {/* Active dot */}

                                                {active && (
                                                    <span className="ml-0.5 h-1 w-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,.9)]" />
                                                )}

                                                {/* Underline */}

                                                <span
                                                    className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-white transition-all duration-500 ${active
                                                            ? "w-6 opacity-70"
                                                            : "w-0 opacity-0 group-hover:w-5 group-hover:opacity-40"
                                                        }`}
                                                />
                                            </Link>
                                        );
                                    }
                                )}
                            </nav>

                            {/* =================================================
                                RIGHT CONTROLS
                            ================================================= */}

                            <div className="flex items-center gap-1.5">

                                {/* =================================================
                                    SEARCH
                                ================================================= */}

                                <form
                                    onSubmit={
                                        handleSearch
                                    }
                                    className="hidden 2xl:block"
                                    role="search"
                                >
                                    <div className="group relative">

                                        <SearchIcon
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20 transition group-focus-within:text-white/55"
                                        />

                                        <input
                                            id="coderush-search"
                                            type="search"
                                            value={
                                                search
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setSearch(
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Search challenges..."
                                            aria-label="Search challenges"
                                            className="h-9 w-48 rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-14 text-[11px] text-white outline-none transition-all placeholder:text-white/20 focus:w-56 focus:border-white/[0.17] focus:bg-white/[0.05]"
                                        />

                                        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[7px] text-white/20">
                                            /
                                        </kbd>

                                    </div>
                                </form>

                                {/* =================================================
                                    CODE EDITOR
                                ================================================= */}

                                <Link
                                    href="/code"
                                    aria-label="Open code editor"
                                    title="Code Editor"
                                    className="group relative flex h-9 items-center gap-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 text-[10px] font-bold text-white/55 transition-all duration-300 hover:border-white/[0.19] hover:bg-white/[0.075] hover:text-white"
                                >
                                    <span className="relative flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-white/45 transition group-hover:bg-white/10 group-hover:text-white">
                                        <CodeIcon size={13} />
                                    </span>

                                    <span className="hidden lg:block">
                                        Editor
                                    </span>

                                    <ArrowIcon
                                        size={11}
                                        className="hidden opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-60 lg:block"
                                    />
                                </Link>

                                {/* =================================================
                                    THEME TOGGLE
                                ================================================= */}

                                {themeReady && (
                                    <button
                                        type="button"
                                        onClick={
                                            toggleTheme
                                        }
                                        aria-label={
                                            theme ===
                                                "dark"
                                                ? "Switch to light mode"
                                                : "Switch to dark mode"
                                        }
                                        title={
                                            theme ===
                                                "dark"
                                                ? "Light Mode"
                                                : "Dark Mode"
                                        }
                                        className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/45 transition-all duration-300 hover:border-white/[0.18] hover:bg-white/[0.075] hover:text-white"
                                    >
                                        {/* Glow */}

                                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

                                        {/* Sun */}

                                        <span
                                            className={`absolute transition-all duration-500 ${theme ===
                                                    "light"
                                                    ? "rotate-0 scale-100 opacity-100"
                                                    : "rotate-90 scale-0 opacity-0"
                                                }`}
                                        >
                                            <SunIcon />
                                        </span>

                                        {/* Moon */}

                                        <span
                                            className={`absolute transition-all duration-500 ${theme ===
                                                    "dark"
                                                    ? "rotate-0 scale-100 opacity-100"
                                                    : "-rotate-90 scale-0 opacity-0"
                                                }`}
                                        >
                                            <MoonIcon />
                                        </span>
                                    </button>
                                )}

                                {/* =================================================
                                    NOTIFICATIONS
                                ================================================= */}

                                {user ? (
                                    <div className="premium-notification">
                                        <NotificationBell />
                                    </div>
                                ) : null}

                                {/* =================================================
                                    USER MENU
                                ================================================= */}

                                <div
                                    ref={menuRef}
                                    className="relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMenuOpen(
                                                (
                                                    open
                                                ) =>
                                                    !open
                                            )
                                        }
                                        aria-haspopup="menu"
                                        aria-expanded={
                                            menuOpen
                                        }
                                        aria-label="Open user menu"
                                        className={`group flex h-9 items-center gap-2 rounded-xl border py-1 pl-1 pr-2 transition-all duration-300 ${menuOpen
                                                ? "border-white/[0.2] bg-white/[0.09]"
                                                : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.16] hover:bg-white/[0.06]"
                                            }`}
                                    >
                                        <div className="relative">

                                            <Avatar
                                                avatarUrl={
                                                    user?.avatarUrl ??
                                                    null
                                                }
                                                username={
                                                    username
                                                }
                                                size={
                                                    27
                                                }
                                            />

                                            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full border border-black bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />

                                        </div>

                                        <span className="hidden max-w-[90px] truncate text-[10px] font-semibold text-white/60 sm:block">
                                            {username ??
                                                "..."}
                                        </span>

                                        <ChevronIcon
                                            open={
                                                menuOpen
                                            }
                                        />
                                    </button>

                                    {/* User menu */}

                                    {menuOpen && (
                                        <UserMenu
                                            user={
                                                user
                                            }
                                            username={
                                                username
                                            }
                                            profileHref={
                                                profileHref
                                            }
                                            isSuperAdmin={
                                                isSuperAdmin
                                            }
                                            loggingOut={
                                                loggingOut
                                            }
                                            onClose={() =>
                                                setMenuOpen(
                                                    false
                                                )
                                            }
                                            onLogout={
                                                handleLogout
                                            }
                                        />
                                    )}
                                </div>

                                {/* =================================================
                                    MOBILE BUTTON
                                ================================================= */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setMobileOpen(
                                            (
                                                open
                                            ) =>
                                                !open
                                        )
                                    }
                                    aria-expanded={
                                        mobileOpen
                                    }
                                    aria-controls="mobile-navigation"
                                    aria-label={
                                        mobileOpen
                                            ? "Close navigation"
                                            : "Open navigation"
                                    }
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/50 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white xl:hidden"
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

                    {/* =================================================
                        MOBILE PANEL
                    ================================================= */}

                    {mobileOpen && (
                        <div
                            ref={
                                mobilePanelRef
                            }
                            id="mobile-navigation"
                            className="relative mt-2 overflow-hidden rounded-2xl border border-white/[0.09] bg-black p-2 shadow-[0_25px_90px_rgba(0,0,0,.7)] xl:hidden"
                            style={{
                                backdropFilter:
                                    "blur(28px)",
                                WebkitBackdropFilter:
                                    "blur(28px)",
                            }}
                        >
                            {/* Header */}

                            <div className="mb-2 flex items-center justify-between px-3 pb-2 pt-2">

                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">
                                    Navigation
                                </p>

                                {/* Mobile theme */}

                                <button
                                    type="button"
                                    onClick={
                                        toggleTheme
                                    }
                                    className="flex h-8 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 text-white/40 transition hover:bg-white/[0.07] hover:text-white"
                                >
                                    {theme ===
                                        "dark" ? (
                                        <>
                                            <SunIcon
                                                size={
                                                    13
                                                }
                                            />
                                            <span className="text-[9px] font-semibold">
                                                Light
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <MoonIcon
                                                size={
                                                    13
                                                }
                                            />
                                            <span className="text-[9px] font-semibold">
                                                Dark
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Navigation */}

                            <nav className="space-y-1">
                                {NAV_LINKS.map(
                                    (link) => {
                                        const active =
                                            isActive(
                                                pathname,
                                                link.href
                                            );

                                        return (
                                            <Link
                                                key={
                                                    link.href
                                                }
                                                href={
                                                    link.href
                                                }
                                                onClick={() =>
                                                    setMobileOpen(
                                                        false
                                                    )
                                                }
                                                className={`group flex h-12 items-center justify-between rounded-xl px-3 transition ${active
                                                        ? "bg-white/[0.075] text-white"
                                                        : "text-white/40 hover:bg-white/[0.04] hover:text-white"
                                                    }`}
                                            >
                                                <span className="flex items-center gap-3">

                                                    <span className="font-mono text-[8px] text-white/15">
                                                        {
                                                            link.index
                                                        }
                                                    </span>

                                                    <span className="text-xs font-semibold">
                                                        {
                                                            link.label
                                                        }
                                                    </span>

                                                </span>

                                                {active ? (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_white]" />
                                                ) : (
                                                    <ArrowIcon
                                                        size={
                                                            12
                                                        }
                                                        className="opacity-0 transition group-hover:translate-x-1 group-hover:opacity-40"
                                                    />
                                                )}
                                            </Link>
                                        );
                                    }
                                )}
                            </nav>

                            <div className="my-2 h-px bg-white/[0.06]" />

                            {/* Editor */}

                            <Link
                                href="/code"
                                onClick={() =>
                                    setMobileOpen(
                                        false
                                    )
                                }
                                className="group flex h-12 items-center justify-between rounded-xl bg-white/[0.035] px-3 text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                            >
                                <span className="flex items-center gap-3">

                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.035]">
                                        <CodeIcon
                                            size={
                                                14
                                            }
                                        />
                                    </span>

                                    <span className="text-xs font-semibold">
                                        Open Code Editor
                                    </span>

                                </span>

                                <ArrowIcon size={13} />
                            </Link>

                            {/* Profile */}

                            <Link
                                href={
                                    profileHref
                                }
                                onClick={() =>
                                    setMobileOpen(
                                        false
                                    )
                                }
                                className="mt-1 flex h-11 items-center gap-3 rounded-xl px-3 text-white/35 transition hover:bg-white/[0.04] hover:text-white"
                            >
                                <UserIcon />

                                <span className="text-xs font-semibold">
                                    View Profile
                                </span>
                            </Link>

                            {/* Bookmarks */}

                            <Link
                                href="/bookmarks"
                                onClick={() =>
                                    setMobileOpen(
                                        false
                                    )
                                }
                                className="flex h-11 items-center gap-3 rounded-xl px-3 text-white/35 transition hover:bg-white/[0.04] hover:text-white"
                            >
                                <BookmarkIcon />

                                <span className="text-xs font-semibold">
                                    Bookmarks
                                </span>
                            </Link>

                            {/* Admin */}

                            {isSuperAdmin && (
                                <Link
                                    href="/admin"
                                    onClick={() =>
                                        setMobileOpen(
                                            false
                                        )
                                    }
                                    className="flex h-11 items-center gap-3 rounded-xl px-3 text-white/35 transition hover:bg-white/[0.04] hover:text-white"
                                >
                                    <ShieldIcon />

                                    <span className="text-xs font-semibold">
                                        Super Admin Dashboard
                                    </span>
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* ============================================================
                GLOBAL PREMIUM CSS
            ============================================================ */}

            <style jsx global>{`
                .premium-notification {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .premium-notification button {
                    border-radius: 12px !important;
                    transition:
                        transform 0.3s cubic-bezier(.16,1,.3,1),
                        background 0.3s ease,
                        border-color 0.3s ease;
                }

                .premium-notification button:hover {
                    transform: translateY(-1px);
                }

                /* ========================================================
                   THEME ROOT
                ======================================================== */

                html {
                    transition:
                        background-color 0.4s ease,
                        color 0.4s ease;
                }

                html.dark {
                    color-scheme: dark;
                    background: #050505;
                }

                html.light {
                    color-scheme: light;
                    background: #f5f5f5;
                }

                /* ========================================================
                   PREMIUM THEME TRANSITION
                ======================================================== */

                html.theme-transitioning,
                html.theme-transitioning *,
                html.theme-transitioning *::before,
                html.theme-transitioning *::after {
                    transition:
                        background-color 0.45s ease,
                        border-color 0.45s ease,
                        color 0.45s ease,
                        box-shadow 0.45s ease,
                        fill 0.45s ease,
                        stroke 0.45s ease !important;
                }

                /* ========================================================
                   SCROLLBAR
                ======================================================== */

                ::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                ::-webkit-scrollbar-track {
                    background: transparent;
                }

                ::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,.08);
                    border-radius: 999px;
                }

                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,.16);
                }

                /* ========================================================
                   SELECTION
                ======================================================== */

                ::selection {
                    background: rgba(255,255,255,.18);
                    color: white;
                }

                /* ========================================================
                   REDUCED MOTION
                ======================================================== */

                @media (prefers-reduced-motion: reduce) {
                    *,
                    *::before,
                    *::after {
                        scroll-behavior: auto !important;
                        animation-duration: .01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: .01ms !important;
                    }
                }
            `}</style>
        </>
    );
}

/* ================================================================
   USER MENU
================================================================ */

function UserMenu({
    user,
    username,
    profileHref,
    isSuperAdmin,
    loggingOut,
    onClose,
    onLogout,
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
}) {
    return (
        <div
            role="menu"
            aria-label="User menu"
            className="absolute right-0 top-[calc(100%+10px)] w-[290px] overflow-hidden rounded-2xl border border-white/[0.1] bg-black p-2 shadow-[0_30px_110px_rgba(0,0,0,.75)]"
            style={{
                backdropFilter:
                    "blur(32px)",
                WebkitBackdropFilter:
                    "blur(32px)",
            }}
        >
            {/* Top light */}

            <div className="pointer-events-none absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Profile */}

            <div className="relative mb-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.035] p-3">

                <div className="absolute right-[-30px] top-[-30px] h-24 w-24 rounded-full bg-white/[0.035] blur-2xl" />

                <div className="relative flex items-center gap-3">

                    <div className="relative">

                        <Avatar
                            avatarUrl={
                                user?.avatarUrl ??
                                null
                            }
                            username={
                                username
                            }
                            size={42}
                        />

                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]" />
                    </div>

                    <div className="min-w-0">

                        <p className="truncate text-sm font-bold text-white">
                            {username ??
                                "Your account"}
                        </p>

                        <p className="mt-0.5 truncate text-[10px] text-white/25">
                            {user?.email ??
                                "Signed in"}
                        </p>

                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5">

                    <span className="text-[7px] font-bold uppercase tracking-[0.25em] text-white/20">
                        Account Status
                    </span>

                    <span className="flex items-center gap-1.5 text-[7px] font-bold uppercase tracking-[0.15em] text-emerald-400/70">

                        <span className="h-1 w-1 rounded-full bg-emerald-400" />

                        Active
                    </span>
                </div>
            </div>

            {/* Account */}

            <MenuItem
                href={profileHref}
                icon={<UserIcon />}
                label="View Profile"
                onClick={onClose}
            />

            <MenuItem
                href="/profile"
                icon={<EditIcon />}
                label="Edit Profile"
                onClick={onClose}
            />

            {isSuperAdmin && (
                <MenuItem
                    href="/admin"
                    icon={<ShieldIcon />}
                    label="Super Admin Dashboard"
                    badge="ADMIN"
                    onClick={onClose}
                />
            )}

            <div className="my-1.5 h-px bg-white/[0.06]" />

            {/* Workspace */}

            <MenuItem
                href="/leaderboard"
                icon={<TrophyIcon />}
                label="Leaderboard"
                onClick={onClose}
            />

            <MenuItem
                href="/analytics"
                icon={<ChartIcon />}
                label="Analytics"
                onClick={onClose}
            />

            <MenuItem
                href="/bookmarks"
                icon={<BookmarkIcon />}
                label="Bookmarks"
                onClick={onClose}
            />

            <MenuItem
                href="/code"
                icon={<CodeIcon />}
                label="Code Editor"
                onClick={onClose}
            />

            <div className="my-1.5 h-px bg-white/[0.06]" />

            {/* Logout */}

            <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                disabled={loggingOut}
                className="group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[11px] font-semibold text-red-400/60 transition hover:bg-red-400/[0.06] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400/[0.05] transition group-hover:bg-red-400/[0.09]">
                    <LogoutIcon />
                </span>

                {loggingOut
                    ? "Logging out..."
                    : "Logout"}
            </button>

            {/* Footer */}

            <div className="px-3 pb-1 pt-3 text-center">
                <span className="font-mono text-[7px] uppercase tracking-[0.25em] text-white/10">
                    CodeRush Developer OS
                </span>
            </div>
        </div>
    );
}

/* ================================================================
   MENU ITEM
================================================================ */

function MenuItem({
    href,
    icon,
    label,
    badge,
    onClick,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    badge?: string;
    onClick: () => void;
}) {
    return (
        <Link
            role="menuitem"
            href={href}
            onClick={onClick}
            className="group flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-white/40 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
        >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.025] text-white/25 transition group-hover:bg-white/[0.07] group-hover:text-white/70">
                {icon}
            </span>

            <span className="flex-1">
                {label}
            </span>

            {badge && (
                <span className="rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[6px] font-black tracking-[0.15em] text-white/30">
                    {badge}
                </span>
            )}

            <ArrowIcon
                size={11}
                className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-30"
            />
        </Link>
    );
}

/* ================================================================
   SEARCH
================================================================ */

function SearchIcon({
    className = "",
}: {
    className?: string;
}) {
    return (
        <svg
            className={className}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle
                cx="11"
                cy="11"
                r="7"
            />

            <path d="m20 20-4-4" />
        </svg>
    );
}

/* ================================================================
   CODE
================================================================ */

function CodeIcon({
    size = 16,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="16 18 22 12 16 6" />

            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

/* ================================================================
   USER
================================================================ */

function UserIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />

            <circle
                cx="12"
                cy="7"
                r="4"
            />
        </svg>
    );
}

/* ================================================================
   EDIT
================================================================ */

function EditIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 20h9" />

            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
    );
}

/* ================================================================
   SHIELD
================================================================ */

function ShieldIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7Z" />

            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

/* ================================================================
   TROPHY
================================================================ */

function TrophyIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 4H4a2 2 0 0 0 0 4h2" />

            <path d="M18 4h2a2 2 0 0 1 0 4h-2" />

            <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" />

            <path d="M12 15v4" />

            <path d="M8 22h8" />

            <path d="M9 19h6" />
        </svg>
    );
}

/* ================================================================
   CHART
================================================================ */

function ChartIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M4 19V5" />

            <path d="M4 19h17" />

            <path d="m7 15 4-4 3 2 5-7" />
        </svg>
    );
}

/* ================================================================
   BOOKMARK
================================================================ */

function BookmarkIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z" />
        </svg>
    );
}

/* ================================================================
   LOGOUT
================================================================ */

function LogoutIcon() {
    return (
        <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

            <polyline points="16 17 21 12 16 7" />

            <line
                x1="21"
                y1="12"
                x2="9"
                y2="12"
            />
        </svg>
    );
}

/* ================================================================
   ARROW
================================================================ */

function ArrowIcon({
    size = 14,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
            />

            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

/* ================================================================
   CHEVRON
================================================================ */

function ChevronIcon({
    open,
}: {
    open: boolean;
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
            className={`text-white/20 transition-transform duration-300 ${open
                    ? "rotate-180"
                    : ""
                }`}
            aria-hidden="true"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

/* ================================================================
   MENU
================================================================ */

function MenuIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line
                x1="4"
                y1="7"
                x2="20"
                y2="7"
            />

            <line
                x1="4"
                y1="12"
                x2="20"
                y2="12"
            />

            <line
                x1="4"
                y1="17"
                x2="20"
                y2="17"
            />
        </svg>
    );
}

/* ================================================================
   CLOSE
================================================================ */

function CloseIcon() {
    return (
        <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
            />

            <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
            />
        </svg>
    );
}

/* ================================================================
   SUN
================================================================ */

function SunIcon({
    size = 15,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="12"
                r="4"
            />

            <line
                x1="12"
                y1="2"
                x2="12"
                y2="4"
            />

            <line
                x1="12"
                y1="20"
                x2="12"
                y2="22"
            />

            <line
                x1="4.93"
                y1="4.93"
                x2="6.34"
                y2="6.34"
            />

            <line
                x1="17.66"
                y1="17.66"
                x2="19.07"
                y2="19.07"
            />

            <line
                x1="2"
                y1="12"
                x2="4"
                y2="12"
            />

            <line
                x1="20"
                y1="12"
                x2="22"
                y2="12"
            />

            <line
                x1="4.93"
                y1="19.07"
                x2="6.34"
                y2="17.66"
            />

            <line
                x1="17.66"
                y1="6.34"
                x2="19.07"
                y2="4.93"
            />
        </svg>
    );
}

/* ================================================================
   MOON
================================================================ */

function MoonIcon({
    size = 15,
}: {
    size?: number;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
    );
}
