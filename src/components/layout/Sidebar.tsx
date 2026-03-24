"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Map,
  Dumbbell,
  Swords,
  User,
  UserPlus,
  Settings,
  LogOut,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Bot,
  Users,
  GraduationCap,
  FileText,
} from "lucide-react";

interface SidebarProps {
  user: { name?: string | null; email?: string | null };
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function SidebarShell({
  user,
  items,
  title,
}: SidebarProps & { items: NavItem[]; title: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-card" role="navigation" aria-label="Main navigation">
      <div className="border-b border-border p-4">
        <Link href="/" className="text-lg font-bold text-primary">
          {title}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-3 text-sm font-medium text-foreground truncate">
          {user.name}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export function StudentSidebar({ user }: SidebarProps) {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/quest-map", label: "Quest Map", icon: <Map size={18} /> },
    { href: "/practice", label: "Practice", icon: <Dumbbell size={18} /> },
    { href: "/challenge", label: "Challenges", icon: <Swords size={18} /> },
    { href: "/friends", label: "Friends", icon: <UserPlus size={18} /> },
    { href: "/ib-prep", label: "IB Prep", icon: <FileText size={18} /> },
    { href: "/profile", label: "Profile", icon: <User size={18} /> },
    { href: "/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return <SidebarShell user={user} items={items} title="MathQuest" />;
}

export function TeacherSidebar({ user }: SidebarProps) {
  const items: NavItem[] = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/teacher/curriculum", label: "Curriculum", icon: <BookOpen size={18} /> },
    { href: "/teacher/problems", label: "Problems", icon: <HelpCircle size={18} /> },
    { href: "/teacher/ai-assistant", label: "AI Assistant", icon: <Bot size={18} /> },
    { href: "/teacher/classes", label: "Classes", icon: <GraduationCap size={18} /> },
    { href: "/teacher/students", label: "Students", icon: <Users size={18} /> },
    { href: "/teacher/settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return <SidebarShell user={user} items={items} title="MathQuest Teacher" />;
}
