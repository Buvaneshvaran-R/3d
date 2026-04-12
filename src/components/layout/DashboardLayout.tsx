import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationIcon } from "@/components/NotificationIcon";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const DashboardLayout = () => {
  const { user, isAdmin, selectedStudent, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; time: string; unread: boolean; timestamp: number }>>([]);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 5 seconds
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    try {
      if (isAdmin()) {
        // Admin sees leave notifications and certificate notifications
        const leaveNotifications = JSON.parse(localStorage.getItem('leave_notifications') || '[]');
        const certificateNotifications = JSON.parse(localStorage.getItem('certificate_notifications') || '[]');
        
        // Combine and sort by timestamp
        const combined = [...leaveNotifications, ...certificateNotifications]
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(combined);
      } else {
        // Students see calendar notifications + their own leave/certificate response notifications
        const calendarNotifications = JSON.parse(localStorage.getItem('calendar_notifications') || '[]');
        const studentLeaveNotifications = JSON.parse(localStorage.getItem(`student_notifications_${user?.id}`) || '[]');
        
        // Combine and sort by timestamp
        const combined = [...calendarNotifications, ...studentLeaveNotifications]
          .sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(combined);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    try {
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, unread: false } : n
      );
      setNotifications(updated);
      
      // Update the appropriate storage based on notification type
      if (notificationId.startsWith('calendar-')) {
        localStorage.setItem('calendar_notifications', JSON.stringify(updated));
      } else if (notificationId.startsWith('leave-admin-')) {
        // Admin leave notifications
        localStorage.setItem('leave_notifications', JSON.stringify(updated));
      } else if (notificationId.startsWith('cert-admin-')) {
        // Admin certificate notifications
        localStorage.setItem('certificate_notifications', JSON.stringify(updated));
      } else if (notificationId.startsWith('leave-response-') || notificationId.startsWith('cert-ready-')) {
        // Student leave/certificate response notifications
        localStorage.setItem(`student_notifications_${user?.id}`, JSON.stringify(
          updated.filter(n => n.id.startsWith('leave-response-') || n.id.startsWith('cert-ready-'))
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Main Content */}
      <div className="lg:ml-72 min-h-screen transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Right Side */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Notifications - New Database-backed System */}
              <NotificationIcon />

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
