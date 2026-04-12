import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Calendar,
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  FlaskConical,
  FileCheck,
  GraduationCap,
  MessageSquare,
  CreditCard,
  Users,
  KeyRound,
  GraduationCap as Logo,
  ChevronLeft,
  Menu,
  Printer,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ALLOCATION_OWNER_EMAIL = "chanuadmin@rit.edu";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Award, label: "Achievements", path: "/achievements" },
  { icon: User, label: "Personal Information", path: "/personal-info" },
  { icon: Calendar, label: "My Time Table", path: "/timetable" },
  { icon: BookOpen, label: "My Subject Registration", path: "/subject-registration" },
  { icon: FileText, label: "Apply Leave / OD", path: "/leave-od" },
  { icon: ClipboardList, label: "Attendance", path: "/attendance" },
  { icon: Award, label: "Apply Certificates", path: "/certificates" },
  { icon: FileCheck, label: "CAT Mark", path: "/cat-mark" },
  { icon: FlaskConical, label: "LAB Mark", path: "/lab-mark" },
  { icon: FileText, label: "Assignment Mark", path: "/assignment-mark" },
  { icon: GraduationCap, label: "Grade Book", path: "/gradebook" },
  { icon: MessageSquare, label: "Feedbacks", path: "/feedbacks" },
  { icon: CreditCard, label: "Fee Details", path: "/fee-details" },
  { icon: Users, label: "Class Committee", path: "/class-committee" },
  { icon: Building2, label: "Smart Classroom", path: "/smart-classroom" },
  { icon: Printer, label: "Print Services", path: "/print" },
  { icon: BookOpen, label: "Moodle", path: "/moodle" },
  { icon: KeyRound, label: "Change Password", path: "/change-password" },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const canAccessAllocationModule = user?.email?.toLowerCase() === ALLOCATION_OWNER_EMAIL;

  const visibleMenuItems = canAccessAllocationModule
    ? [
        ...menuItems.slice(0, 16),
        { icon: ClipboardList, label: "Classroom Allocation", path: "/classroom-allocation" },
        ...menuItems.slice(16),
      ]
    : menuItems;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {!collapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen gradient-sidebar z-40 transition-all duration-300 flex flex-col",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "translate-x-0 w-72 lg:w-72"
        )}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Logo className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold text-sidebar-foreground">RIT</h1>
              <p className="text-xs text-sidebar-foreground/60">Students Portal</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle - Desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-16 w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <ChevronLeft
            className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent">
          <ul className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => window.innerWidth < 1024 && setCollapsed(true)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-foreground/40 text-center">
              © 2024 RIT Chennai
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
