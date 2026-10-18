"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Zap, LogOut, LayoutDashboard, Shield, LogIn, UserPlus, BarChart3, Menu, X, RefreshCw } from "lucide-react";

interface UserSession {
  userId: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load user session on mount, and re-check if transitioning between auth and app routes
  useEffect(() => {
    const isAuthRoute = pathname === "/login" || pathname === "/register";
    const isAppRoute =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/analytics") ||
      pathname.startsWith("/admin");

    if (!user || (isAppRoute && !user) || (isAuthRoute && user)) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user || null);
        })
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    }
  }, [pathname, user]);

  // Listen for auth change events across tabs or local mutations
  useEffect(() => {
    const handleAuthEvent = () => {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => setUser(data.user || null))
        .catch(() => setUser(null));
    };
    window.addEventListener("auth-change", handleAuthEvent);
    return () => window.removeEventListener("auth-change", handleAuthEvent);
  }, []);

  // Clear pending state and close mobile menu whenever pathname changes
  useEffect(() => {
    setPendingPath(null);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleNavClick = (targetPath: string) => {
    if (pathname !== targetPath) {
      setPendingPath(targetPath);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <div className="brand-icon">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <span>LinkPulse</span>
        </Link>

        {/* Mobile menu button (360px - 768px) */}
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop nav links */}
        <nav className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                prefetch={true}
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/dashboard" ? "active" : ""
                } ${pendingPath === "/dashboard" ? "nav-link-pending" : ""}`}
                aria-busy={pendingPath === "/dashboard"}
                onClick={() => handleNavClick("/dashboard")}
              >
                {pendingPath === "/dashboard" ? (
                  <RefreshCw size={18} className="spin" />
                ) : (
                  <LayoutDashboard size={18} />
                )}
                <span>Dashboard</span>
              </Link>

              <Link
                href="/analytics"
                prefetch={true}
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/analytics" ? "active" : ""
                } ${pendingPath === "/analytics" ? "nav-link-pending" : ""}`}
                aria-busy={pendingPath === "/analytics"}
                onClick={() => handleNavClick("/analytics")}
              >
                {pendingPath === "/analytics" ? (
                  <RefreshCw size={18} className="spin" />
                ) : (
                  <BarChart3 size={18} />
                )}
                <span>Analytics</span>
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  prefetch={true}
                  className={`nav-link flex items-center gap-2 ${
                    pathname === "/admin" ? "active" : ""
                  } ${pendingPath === "/admin" ? "nav-link-pending" : ""}`}
                  aria-busy={pendingPath === "/admin"}
                  onClick={() => handleNavClick("/admin")}
                >
                  {pendingPath === "/admin" ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    <Shield size={18} />
                  )}
                  <span>Admin</span>
                </Link>
              )}

              <div className="nav-user-cluster">
                <div
                  className="nav-user-chip"
                  title={user.email}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    textTransform: "none",
                  }}
                >
                  <span className="sr-only">Logged in as {user.email}</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    aria-hidden="true"
                  >
                    {user.email}
                  </span>
                  {user.role === "ADMIN" && (
                    <span
                      className="badge badge-admin"
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.1rem 0.4rem",
                        flexShrink: 0,
                        textTransform: "uppercase",
                      }}
                    >
                      Admin
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  aria-busy={loggingOut}
                  className="btn btn-secondary btn-sm"
                  title="Sign out of your account"
                >
                  {loggingOut ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    <LogOut size={16} />
                  )}
                  <span>{loggingOut ? "Signing Out..." : "Logout"}</span>
                </button>
              </div>
            </>
          ) : !loading ? (
            <div className="nav-auth-buttons">
              <Link
                href="/login"
                className="btn btn-secondary btn-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link
                href="/register"
                className="btn btn-primary btn-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserPlus size={16} />
                <span>Register</span>
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
