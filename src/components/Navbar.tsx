"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Zap, LogOut, LayoutDashboard, Shield, LogIn, UserPlus, BarChart3, Menu, X } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
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
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/dashboard" ? "active" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/analytics"
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/analytics" ? "active" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <BarChart3 size={18} />
                <span>Analytics</span>
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`nav-link flex items-center gap-2 ${
                    pathname === "/admin" ? "active" : ""
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield size={18} />
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
                  className="btn btn-secondary btn-sm"
                  title="Sign out of your account"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
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
