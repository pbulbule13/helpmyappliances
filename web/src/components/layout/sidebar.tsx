"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Home, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { DEV_MODE, devClear } from "@/lib/dev-auth";

const NAV = [
  { href: "/dashboard", label: "My Appliances", icon: Home },
  { href: "/scan", label: "Add Appliance", icon: Plus },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, devEmail } = useAuth();

  const email = appUser?.email ?? devEmail ?? "";
  const name = appUser?.display_name || email.split("@")[0] || "User";

  const handleLogout = async () => {
    if (DEV_MODE) {
      devClear();
      router.replace("/login");
      return;
    }
    const { logout } = await import("@/lib/firebase");
    await logout();
    router.replace("/login");
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-gray-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
        <span className="text-2xl">🔧</span>
        <span className="font-semibold text-base leading-tight">
          HelpMy<br />Appliances
        </span>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-sm font-bold text-white uppercase">
            {name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-gray-400 truncate">{email}</p>
          </div>
        </div>
        {DEV_MODE && (
          <span className="inline-block mt-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            dev mode
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname === href || (href === "/dashboard" && pathname.startsWith("/devices"))
                ? "bg-brand-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
