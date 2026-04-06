import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, MessageCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Notification {
  id: string;
  sender_id: string;
  recipient_id: string;
  recipient_type: string;
  subject: string;
  message: string;
  request_type: string;
  status: string;
  is_read: boolean;
  parent_notification_id: string | null;
  created_at: string;
  sender_name?: string;
}

const Messages = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for sending new message
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [requestType, setRequestType] = useState("general");
  
  // Form states for responding
  const [responseMessage, setResponseMessage] = useState("");
  const [responseStatus, setResponseStatus] = useState<'resolved' | 'rejected'>('resolved');

  useEffect(() => {
    if (user) {
      loadNotifications();

      // Set up realtime subscription
      const channel = supabase
        .channel('messages-page')
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

      const interval = setInterval(loadNotifications, 5000);

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
        .order('created_at', { ascending: false });

      if (isAdmin()) {
        query = query.eq('recipient_type', 'admin');
      } else {
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

      // Fetch sender names for admin view
      if (data && isAdmin()) {
        const notificationsWithNames = await Promise.all(
          data.map(async (notif) => {
            if (notif.sender_id) {
              const { data: senderData } = await supabase
                .from('students')
                .select('name')
                .eq('id', notif.sender_id)
                .single();
              return { ...notif, sender_name: senderData?.name || 'Unknown Student' };
            }
            return { ...notif, sender_name: 'Admin' };
          })
        );
        setNotifications(notificationsWithNames);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const sendRequest = async () => {
    if (!newSubject || !newMessage || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!studentData) throw new Error('Student not found');

      const { error } = await supabase
        .from('notifications')
        .insert({
          sender_id: studentData.id,
          recipient_type: 'admin',
          subject: newSubject,
          message: newMessage,
          request_type: requestType,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Request Sent",
        description: "Your message has been sent to admin"
      });

      setNewSubject("");
      setNewMessage("");
      setRequestType("general");
      loadNotifications();
    } catch (error: Error | unknown) {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendResponse = async () => {
    if (!selectedNotification || !responseMessage || !isAdmin()) return;

    setLoading(true);
    try {
      // Update original notification status
      await supabase
        .from('notifications')
        .update({ status: responseStatus, is_read: true })
        .eq('id', selectedNotification.id);

      // Send response notification to student
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: selectedNotification.sender_id,
          recipient_type: 'student',
          subject: `Re: ${selectedNotification.subject}`,
          message: responseMessage,
          request_type: selectedNotification.request_type,
          status: responseStatus,
          parent_notification_id: selectedNotification.id
        });

      if (error) throw error;

      toast({
        title: "Response Sent",
        description: "Your response has been sent to the student"
      });

      setResponseMessage("");
      setSelectedNotification(null);
      loadNotifications();
    } catch (error: Error | unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send response",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      console.error('Error marking as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const resolvedCount = notifications.filter(n => n.status === 'resolved').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Messages & Requests</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{resolvedCount}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={isAdmin() ? "inbox" : "send"} className="w-full">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          {!isAdmin() && <TabsTrigger value="send">Send Request</TabsTrigger>}
        </TabsList>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Messages List */}
            <Card className="border-none shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isAdmin() ? 'Student Requests' : 'Your Messages'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setSelectedNotification(notif);
                        markAsRead(notif.id);
                      }}
                      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedNotification?.id === notif.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${!notif.is_read ? 'bg-muted/30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                          )}
                          <p className="font-semibold text-sm">{notif.subject}</p>
                        </div>
                        <Badge
                          variant={
                            notif.status === 'resolved' ? 'default' :
                            notif.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {notif.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {isAdmin() && notif.sender_name ? `From: ${notif.sender_name}` : 'From: Admin'}
                        </span>
                        <span>{new Date(notif.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Message Detail */}
            <Card className="border-none shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedNotification ? 'Message Details' : 'Select a message'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedNotification ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a message to view details</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="pb-4 border-b">
                      <h3 className="font-bold text-lg mb-2">{selectedNotification.subject}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {isAdmin() && selectedNotification.sender_name
                            ? `From: ${selectedNotification.sender_name}`
                            : 'From: Admin'}
                        </span>
                        <span>{new Date(selectedNotification.created_at).toLocaleString()}</span>
                      </div>
                      <Badge className="mt-2" variant={
                        selectedNotification.status === 'resolved' ? 'default' :
                        selectedNotification.status === 'rejected' ? 'destructive' :
                        'secondary'
                      }>
                        {selectedNotification.status}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Message:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedNotification.message}
                      </p>
                    </div>

                    {/* Admin Response Form */}
                    {isAdmin() && selectedNotification.status === 'pending' && (
                      <div className="pt-4 border-t space-y-4">
                        <h4 className="font-semibold">Send Response</h4>
                        
                        <div className="space-y-2">
                          <Label>Response Status</Label>
                          <Select value={responseStatus} onValueChange={(value: string) => setResponseStatus(value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resolved">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-success" />
                                  Resolved
                                </div>
                              </SelectItem>
                              <SelectItem value="rejected">
                                <div className="flex items-center gap-2">
                                  <XCircle className="w-4 h-4 text-destructive" />
                                  Rejected
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Response Message</Label>
                          <Textarea
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            placeholder="Type your response here..."
                            rows={4}
                          />
                        </div>

                        <Button
                          onClick={sendResponse}
                          disabled={loading || !responseMessage}
                          className="w-full gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Send Response
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Send Request Tab (Student Only) */}
        {!isAdmin() && (
          <TabsContent value="send">
            <Card className="border-none shadow-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Send Request to Admin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Query</SelectItem>
                      <SelectItem value="leave">Leave Request</SelectItem>
                      <SelectItem value="od">OD Request</SelectItem>
                      <SelectItem value="certificate">Certificate Request</SelectItem>
                      <SelectItem value="academic">Academic Issue</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Enter subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                  />
                </div>

                <Button
                  onClick={sendRequest}
                  disabled={loading || !newSubject || !newMessage}
                  className="w-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Messages;
