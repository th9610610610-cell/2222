"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, User, LogOut, Settings } from "lucide-react";

interface NavbarProps {
  user?: { id: string; name: string; phone: string; role: "user" | "admin" | "moderator" };
  notifications?: number;
  onLogout?: () => void;
}

export function Navbar({ user, notifications = 0, onLogout }: NavbarProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    if (onLogout) onLogout();
    setShowMenu(false);
    setTimeout(() => router.push("/login"), 300);
  };

  return (
    <nav className="sticky top-0 z-50 bg-darkCard/80 backdrop-blur-xl border-b border-purple-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <div className="text-2xl">👑</div>
            <span className="text-xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">Lotto Win</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <button className="relative p-2 hover:bg-purple-500/10 rounded-lg transition-colors">
                <Bell size={20} />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {notifications > 9 ? "9+" : notifications}
                  </span>
                )}
              </button>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-white font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-darkCard border border-purple-500/20 rounded-lg shadow-xl overflow-hidden animate-fadeIn">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push("/profile");
                      }}
                      className="w-full px-4 py-3 hover:bg-purple-500/10 flex items-center gap-3 transition-colors text-left"
                    >
                      <User size={18} className="text-primary" />
                      <div>
                        <div className="text-sm font-medium">Profile</div>
                        <div className="text-xs text-gray-400">{user.phone}</div>
                      </div>
                    </button>

                    {user.role !== "user" && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push("/admin");
                        }}
                        className="w-full px-4 py-3 hover:bg-purple-500/10 flex items-center gap-3 transition-colors text-left border-t border-purple-500/10"
                      >
                        <Settings size={18} className="text-secondary" />
                        <span className="text-sm font-medium">Admin Panel</span>
                      </button>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 hover:bg-red-500/10 flex items-center gap-3 transition-colors text-left border-t border-purple-500/10 text-red-400"
                    >
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => router.push("/login")} className="btn-primary text-sm">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}