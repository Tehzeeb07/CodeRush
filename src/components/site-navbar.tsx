"use client";

/**
 * CodeRush — Global Premium Navbar
 *
 * Rendered once at the app root. Handles:
 *  - primary navigation (Dashboard / Challenges / Showcase / Leaderboard / Analytics)
 *  - active-route highlighting via usePathname
 *  - a glass user dropdown (profile, bookmarks, logout)
 *  - click-outside + Escape-key closing
 *  - keyboard accessibility
 *  - responsive hamburger menu on small screens
 *
 * Reuses the existing auth/user queries only. No backend logic here.
 */

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
}

const [userSearch, setUserSearch] = useState("");
const userResults = useQuery(
    api.users.searchByUsername,
    userSearch.trim() ? { query: userSearch.trim() } : "skip"
);
const NAV_LINKS: NavEntry[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/challenges", label: "Challenges" },
    { href: "/showcase", label: "Showcase" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/analytics", label: "Analytics" },
];

/** Routes that keep their own dedicated chrome (auth + editor workspace). */
const HIDDEN_ROUTES = new Set(["/", "/login", "/signup", "/code"]);

function isActive(pathname: string, href: string): boolean {
    if (pathname === href) return true;

    // Highlight parent nav for nested routes, e.g. /challenges/<id>.
    return href !== "/dashboard" && pathname.startsWith(`${href}/`);
}

function Logo() {
    return (
        <Link
            href="/"
            className="no-focus-ring flex items-center gap-2.5 rounded-lg"
            aria-label="CodeRush home"
        >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-[0_4px_14px_rgba(99,102,241,0.35)]">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                </svg>
            </span>

            <span className="text-[17px] font-bold tracking-tight text-white">
                Code<span className="text-[#818cf8]">Rush</span>
            </span>
        </Link>
    );
}

function Avatar({
    avatarUrl,
    username,
    size = 36,
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
                className="rounded-full object-cover"
                style={style}
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
            />
        );
    }

    return (
        <span
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-sm font-semibold text-white"
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

    const menuRef = useRef<HTMLDivElement>(null);
    const mobilePanelRef = useRef<HTMLDivElement>(null);

    const user = useQuery(api.users.currentUser);

    // Server-resolved role (convex/roles.ts). The SUPER_ADMIN decision is
    // made on the backend via the SUPER_ADMINS email list — the client only
    // reads the verdict, it never decides by email matching itself.
    const identity = useQuery(api.roles.me);
    const isSuperAdmin = identity?.role === "SUPER_ADMIN";

    // Click-outside + Escape-key closing for both menus.
    useEffect(() => {
        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node;

            if (menuRef.current && !menuRef.current.contains(target)) {
                setMenuOpen(false);
            }

            if (
                mobilePanelRef.current &&
                !mobilePanelRef.current.contains(target)
            ) {
                setMobileOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setMenuOpen(false);
                setMobileOpen(false);
            }
        }

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    // Hide the global navbar on public / dedicated-workspace routes.
    if (HIDDEN_ROUTES.has(pathname)) return null;

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

        const q = search.trim();

        router.push(
            q
                ? `/challenges?theme=${encodeURIComponent(q)}`
                : "/challenges"
        );
    }

    const username = user?.username ?? null;
    const profileHref = username ? `/u/${username}` : "/profile";

    return (
        <header
            className="cr-navbar sticky top-0 z-50"
            style={{
                background: "rgba(9, 9, 11, 0.78)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
            }}
        >
            <div className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">

                {/* Left: Logo */}
                <div className="flex shrink-0 items-center gap-3">
                    <Logo />
                </div>

                {/* Main Navigation - Desktop */}
                <nav
                    className="hidden items-center gap-1 lg:flex"
                    aria-label="Primary"
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            aria-current={
                                isActive(pathname, link.href)
                                    ? "page"
                                    : undefined
                            }
                            className={`nav-item ${isActive(pathname, link.href)
                                ? "active"
                                : ""
                                }`}
                        >
                            {link.label}

                            <span
                                className="nav-indicator"
                                aria-hidden="true"
                            />
                        </Link>
                    ))}
                </nav>

                {/* Right: Search + Editor + User Menu + Hamburger */}
                <div className="flex items-center gap-2">

                    {/* Search */}
                    <form
                        onSubmit={handleSearch}
                        className="hidden md:block"
                        role="search"
                    >
                        <div className="relative">
                            <span
                                className="pointer-events-none absolute left-2.5 top-1/2 flex -translate-y-1/2 text-[#71717a]"
                                aria-hidden="true"
                            >
                                <SearchGlyph />
                            </span>

                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search challenges…"
                                aria-label="Search challenges"
                                className="h-9 w-44 rounded-[10px] border border-[#ffffff14] bg-[#ffffff08] pl-8 pr-3 text-sm text-[#e4e4e7] transition-colors placeholder:text-[#71717a] focus:border-[#6366f1] focus:outline-none lg:w-56"
                            />
                        </div>
                    </form>
                                        {/* User search */}
                    <div className="relative hidden md:block">
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Find users…"
                            className="h-9 w-36 rounded-[10px] border border-[#ffffff14] bg-[#ffffff08] px-3 text-sm text-[#e4e4e7] placeholder:text-[#71717a] focus:border-[#6366f1] focus:outline-none lg:w-44"
                        />
                        {userSearch.trim() && userResults && userResults.length > 0 && (
                            <div className="cr-menu absolute right-0 top-[calc(100%+8px)] w-56 p-2 z-50">
                                {userResults.map((u) => (
                                    <Link
                                        key={u.username}
                                        href={`/u/${u.username}`}
                                        className="menu-item"
                                        onClick={() => setUserSearch("")}
                                    >
                                        <Avatar avatarUrl={u.avatarUrl} username={u.username} size={22} />
                                        {u.username}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Code Editor */}
                    <Link
                        href="/code"
                        aria-label="Open the code editor workspace"
                        title="Code Editor"
                        className="icon-btn"
                    >
                        <CodeGlyph size={16} />
                    </Link>

                    {/* Notification Bell - authenticated users only. Reactive
                        Convex queries keep the unread badge in real time. */}
                    {user ? <NotificationBell /> : null}

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() =>
                                setMenuOpen((open) => !open)
                            }
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label="Open user menu"
                            className="flex h-9 items-center gap-2 rounded-[10px] border border-[#ffffff14] bg-[#ffffff06] py-1 pl-1 pr-2.5 transition-colors hover:border-[#818cf8]/50 hover:bg-[#ffffff0d]"
                        >
                            <Avatar
                                avatarUrl={user?.avatarUrl ?? null}
                                username={username}
                                size={28}
                            />

                            <span className="hidden max-w-[110px] truncate text-sm font-medium text-[#e4e4e7] sm:block">
                                {username ?? "…"}
                            </span>

                            <ChevronDownGlyph open={menuOpen} />
                        </button>

                        {menuOpen && (
                            <div
                                role="menu"
                                aria-label="User menu"
                                className="cr-menu absolute right-0 top-[calc(100%+8px)] w-64 p-2"
                            >
                                {user === undefined ? (
                                    <div className="space-y-2 p-2">
                                        <div className="skeleton h-4 w-1/2" />
                                        <div className="skeleton h-3 w-2/3" />
                                    </div>
                                ) : (
                                    <div className="mb-1 flex items-center gap-3 rounded-xl bg-[#ffffff08] px-3 py-2.5">
                                        <Avatar
                                            avatarUrl={
                                                user?.avatarUrl ?? null
                                            }
                                            username={username}
                                            size={36}
                                        />

                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">
                                                {username ?? "Your account"}
                                            </p>

                                            <p className="truncate text-xs text-[#71717a]">
                                                {user?.email ?? "Signed in"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Link
                                    role="menuitem"
                                    href={profileHref}
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <UserGlyph />
                                    View Profile
                                </Link>

                                <Link
                                    role="menuitem"
                                    href="/profile"
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <EditGlyph />
                                    Edit Profile
                                </Link>

                                {/* Super Admin control panel — rendered only
                                    for the server-verified SUPER_ADMIN role. */}
                                {isSuperAdmin && (
                                    <Link
                                        role="menuitem"
                                        href="/admin"
                                        className="menu-item"
                                        onClick={() => setMenuOpen(false)}
                                    >
                                        <ShieldGlyph />
                                        Super Admin Dashboard
                                    </Link>
                                )}

                                <div
                                    className="menu-separator"
                                    role="separator"
                                />

                                <Link
                                    role="menuitem"
                                    href="/leaderboard"
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <TrophyGlyph />
                                    Leaderboard
                                </Link>

                                {/* Analytics */}
                                <Link
                                    role="menuitem"
                                    href="/analytics"
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <AnalyticsGlyph />
                                    Analytics
                                </Link>

                                <Link
                                    role="menuitem"
                                    href="/bookmarks"
                                    className="menu-item"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <BookmarkGlyph />
                                    Bookmarks
                                </Link>

                                <div
                                    className="menu-separator"
                                    role="separator"
                                />

                                <button
                                    type="button"
                                    role="menuitem"
                                    className="menu-item danger"
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                >
                                    <LogoutGlyph />

                                    {loggingOut
                                        ? "Logging out…"
                                        : "Logout"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        type="button"
                        className="hamburger lg:hidden"
                        onClick={() =>
                            setMobileOpen((open) => !open)
                        }
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-nav"
                        aria-label={
                            mobileOpen
                                ? "Close navigation menu"
                                : "Open navigation menu"
                        }
                    >
                        {mobileOpen ? (
                            <CloseGlyph />
                        ) : (
                            <HamburgerGlyph />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Panel */}
            {mobileOpen && (
                <div
                    ref={mobilePanelRef}
                    id="mobile-nav"
                    className="cr-menu relative mx-3 mb-3 rounded-[14px] p-2 lg:hidden"
                >
                    <nav
                        className="flex flex-col"
                        aria-label="Primary mobile"
                    >
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() =>
                                    setMobileOpen(false)
                                }
                                aria-current={
                                    isActive(pathname, link.href)
                                        ? "page"
                                        : undefined
                                }
                                className={
                                    isActive(pathname, link.href)
                                        ? "nav-item active justify-between rounded-xl px-4 py-2.5 text-[15px]"
                                        : "nav-item justify-between rounded-xl px-4 py-2.5 text-[15px] hover:bg-[#ffffff08]"
                                }
                            >
                                {link.label}

                                {isActive(pathname, link.href) && (
                                    <span
                                        className="h-1.5 w-1.5 rounded-full bg-[#6366f1]"
                                        aria-hidden="true"
                                    />
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="menu-separator" />

                    <Link
                        href={profileHref}
                        className="menu-item"
                        onClick={() => setMobileOpen(false)}
                    >
                        <UserGlyph />
                        View Profile
                    </Link>

                    <Link
                        href="/profile"
                        className="menu-item"
                        onClick={() => setMobileOpen(false)}
                    >
                        <EditGlyph />
                        Edit Profile
                    </Link>

                    {/* Super Admin control panel — mobile panel mirror. */}
                    {isSuperAdmin && (
                        <Link
                            href="/admin"
                            className="menu-item"
                            onClick={() => setMobileOpen(false)}
                        >
                            <ShieldGlyph />
                            Super Admin Dashboard
                        </Link>
                    )}

                    <Link
                        href="/bookmarks"
                        className="menu-item"
                        onClick={() => setMobileOpen(false)}
                    >
                        <BookmarkGlyph />
                        Bookmarks
                    </Link>
                </div>
            )}
        </header>
    );
}

/* -------------------------------------------------------
   Inline Icons
------------------------------------------------------- */

function SearchGlyph() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8" />
            <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
            />
        </svg>
    );
}

function CodeGlyph({ size = 16 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}

function AnalyticsGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    );
}

function ChevronDownGlyph({ open }: { open: boolean }) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`text-[#71717a] transition-transform duration-200 ${open ? "rotate-180" : ""
                }`}
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

function HamburgerGlyph() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function CloseGlyph() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function UserGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function EditGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
    );
}

function TrophyGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    );
}

function BookmarkGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 0-2-2h10a2 2 0 0 0 2 2v16z" />
        </svg>
    );
}

function ShieldGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function LogoutGlyph() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    );
}