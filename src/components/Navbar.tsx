"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Zap, LogOut, LayoutDashboard, Shield, LogIn, UserPlus, BarChart3 } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="brand-logo">
          <div className="brand-icon">
            <Zap size={18} />
          </div>
          <span>LinkPulse</span>
        </Link>

        <nav className="nav-links">
          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/dashboard" ? "active" : ""
                }`}
                style={pathname === "/dashboard" ? { color: "var(--accent-primary)" } : {}}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/analytics"
                className={`nav-link flex items-center gap-2 ${
                  pathname === "/analytics" ? "active" : ""
                }`}
                style={pathname === "/analytics" ? { color: "var(--accent-secondary)" } : {}}
              >
                <BarChart3 size={16} />
                <span>Analytics</span>
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className={`nav-link flex items-center gap-2 ${
                    pathname === "/admin" ? "active" : ""
                  }`}
                  style={pathname === "/admin" ? { color: "#c084fc" } : {}}
                >
                  <Shield size={16} />
                  <span>Admin Console</span>
                </Link>
              )}

              <div className="flex items-center gap-3" style={{ marginLeft: "0.5rem" }}>
                <span className="badge badge-count truncate max-w-xs" title={user.email}>
                  {user.email} {user.role === "ADMIN" && "(Admin)"}
                </span>

                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  title="Sign out of your account"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </>
          ) : !loading ? (
            <div className="flex items-center gap-3">
              <Link href="/login" className="btn btn-secondary btn-sm flex items-center gap-2">
                <LogIn size={14} />
                <span>Sign In</span>
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm flex items-center gap-2">
                <UserPlus size={14} />
                <span>Register</span>
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
