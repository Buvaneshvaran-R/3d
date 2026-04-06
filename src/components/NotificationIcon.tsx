import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  sender_id: string;
  subject: string;
  message: string;
  request_type: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationIcon = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      // Poll for updates
      const interval = setInterval(loadNotifications, 10000);

      return () => {
        channel.unsubscribe();
        clearInterval(interval);
      };
    }
  }, [user, isAdmin]);

  const loadNotifications = async () => {
    try {
      if (!user) return;

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (isAdmin()) {
        // Admin sees notifications sent to admin
        query = query.eq('recipient_type', 'admin');
      } else {
        // Student sees notifications sent to them
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (studentData) {
          query = query
            .eq('recipient_type', 'student')
            .eq('recipient_id', studentData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    navigate('/messages');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{notification.subject}</p>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant={
                          notification.status === 'resolved' ? 'default' :
                          notification.status === 'rejected' ? 'destructive' :
                          'secondary'
                        }
                        className="text-xs"
                      >
                        {notification.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="justify-center text-primary cursor-pointer"
          onClick={() => navigate('/messages')}
        >
          View All Messages
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
