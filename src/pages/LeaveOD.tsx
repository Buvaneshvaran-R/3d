import { StudentFinderWrapper } from "@/components/admin/StudentFinderWrapper";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, CheckCircle2, Clock, XCircle, Calendar, Search, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface LeaveApplication {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  studentName: string;
  rollNumber: string;
  studentId: string;
  createdAt: number;
  documentName?: string;
  documentData?: string; // base64 encoded file data
  documentType?: string; // MIME type
}

const LeaveOD = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [searchRollNumber, setSearchRollNumber] = useState("");
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<LeaveApplication[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ name: string; registerNo: string } | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    fromDate: '',
    toDate: '',
    reason: '',
    document: null as File | null
  });

  useEffect(() => {
    if (user && !isAdmin()) {
      fetchStudentInfo();
    }
    loadApplications();
    const interval = setInterval(loadApplications, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchStudentInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('name, register_no')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setStudentInfo({ name: data.name, registerNo: data.register_no });
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const loadApplications = () => {
    try {
      const saved = localStorage.getItem('leave_applications');
      if (saved) {
        const allApplications: LeaveApplication[] = JSON.parse(saved);
        
        if (isAdmin()) {
          setLeaveApplications(allApplications);
          setFilteredApplications(allApplications);
        } else {
          const myApplications = allApplications.filter(
            app => app.studentId === user?.id
          );
          setLeaveApplications(myApplications);
        }
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const getLeaveStats = () => {
    const approvedPersonal = leaveApplications.filter(
      app => app.status === 'approved' && app.type === 'Personal Leave'
    ).length;
    
    const approvedOD = leaveApplications.filter(
      app => app.status === 'approved' && app.type === 'On Duty (OD)'
    ).length;
    
    const pendingCount = leaveApplications.filter(
      app => app.status === 'pending'
    ).length;
    
    const leaveEligible = 15; // Total leave eligible per semester
    
    return {
      leaveEligible,
      personalLeave: approvedPersonal,
      onDuty: approvedOD,
      leavePending: pendingCount
    };
  };

  const getODThisMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return leaveApplications.filter(app => {
      if (app.type !== 'On Duty (OD)' || app.status !== 'approved') return false;
      const appDate = new Date(app.from);
      return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear;
    }).length;
  };

  const stats = getLeaveStats();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "pending":
        return <Clock className="w-4 h-4 text-warning" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "badge-paid";
      case "pending":
        return "badge-pending";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "";
    }
  };

  const calculateDays = (from: string, to: string): number => {
    if (!from || !to) return 0;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApprove = (applicationId: string) => {
    try {
      const saved = localStorage.getItem('leave_applications');
      if (saved) {
        const allApplications: LeaveApplication[] = JSON.parse(saved);
        const updatedApplications = allApplications.map(app => 
          app.id === applicationId ? { ...app, status: 'approved' as const } : app
        );
        localStorage.setItem('leave_applications', JSON.stringify(updatedApplications));
        
        const application = allApplications.find(app => app.id === applicationId);
        if (application) {
          const studentNotifications = JSON.parse(localStorage.getItem(`student_notifications_${application.studentId}`) || '[]');
          const newNotification = {
            id: `leave-response-${Date.now()}`,
            title: `✅ Leave Approved`,
            message: `Your ${application.type} leave application from ${new Date(application.from).toLocaleDateString()} to ${new Date(application.to).toLocaleDateString()} has been approved`,
            time: new Date().toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit' 
            }),
            unread: true,
            timestamp: Date.now()
          };
          studentNotifications.unshift(newNotification);
          localStorage.setItem(`student_notifications_${application.studentId}`, JSON.stringify(studentNotifications.slice(0, 50)));
        }
        
        loadApplications();
        toast({
          title: "Success",
          description: "Leave application approved successfully"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve application"
      });
    }
  };

  const handleReject = (applicationId: string) => {
    try {
      const saved = localStorage.getItem('leave_applications');
      if (saved) {
        const allApplications: LeaveApplication[] = JSON.parse(saved);
        const updatedApplications = allApplications.map(app => 
          app.id === applicationId ? { ...app, status: 'rejected' as const } : app
        );
        localStorage.setItem('leave_applications', JSON.stringify(updatedApplications));
        
        const application = allApplications.find(app => app.id === applicationId);
        if (application) {
          const studentNotifications = JSON.parse(localStorage.getItem(`student_notifications_${application.studentId}`) || '[]');
          const newNotification = {
            id: `leave-response-${Date.now()}`,
            title: `❌ Leave Rejected`,
            message: `Your ${application.type} leave application from ${new Date(application.from).toLocaleDateString()} to ${new Date(application.to).toLocaleDateString()} has been rejected`,
            time: new Date().toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit' 
            }),
            unread: true,
            timestamp: Date.now()
          };
          studentNotifications.unshift(newNotification);
          localStorage.setItem(`student_notifications_${application.studentId}`, JSON.stringify(studentNotifications.slice(0, 50)));
        }
        
        loadApplications();
        toast({
          title: "Success",
          description: "Leave application rejected"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject application"
      });
    }
  };

  const handleSearch = () => {
    if (!searchRollNumber.trim()) {
      setFilteredApplications(leaveApplications);
      return;
    }
    
    const filtered = leaveApplications.filter(app => 
      app.rollNumber.toLowerCase().includes(searchRollNumber.toLowerCase())
    );
    
    if (filtered.length === 0) {
      toast({
        variant: "destructive",
        title: "No Results",
        description: `No applications found for roll number: ${searchRollNumber}`
      });
    }
    
    setFilteredApplications(filtered);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.fromDate || !formData.toDate || !formData.reason) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill all required fields"
      });
      return;
    }

    if (!studentInfo) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Student information not loaded. Please refresh and try again."
      });
      return;
    }

    // Check if student has any pending applications
    const hasPendingApplication = leaveApplications.some(
      app => app.studentId === user?.id && app.status === 'pending'
    );

    if (hasPendingApplication) {
      toast({
        variant: "destructive",
        title: "Pending Application Exists",
        description: "You cannot submit a new application while you have a pending leave/OD request. Please wait for the current application to be approved or rejected."
      });
      return;
    }

    // Check OD limit: maximum 3 per month
    if (formData.type === 'od') {
      const odThisMonth = getODThisMonth();
      if (odThisMonth >= 3) {
        toast({
          variant: "destructive",
          title: "OD Limit Reached",
          description: "You can only apply for maximum 3 On Duty (OD) applications per month"
        });
        return;
      }
    }

    // Convert file to base64
    if (formData.document) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        saveApplication(base64String, formData.document!.type);
      };
      reader.readAsDataURL(formData.document);
    } else {
      saveApplication();
    }
  };

  const saveApplication = (documentData?: string, documentType?: string) => {
    try {
      const newApplication: LeaveApplication = {
        id: `leave-${Date.now()}`,
        type: formData.type === 'personal' ? 'Personal Leave' : 'On Duty (OD)',
        from: formData.fromDate,
        to: formData.toDate,
        days: calculateDays(formData.fromDate, formData.toDate),
        reason: formData.reason,
        status: 'pending',
        studentName: studentInfo!.name,
        rollNumber: studentInfo!.registerNo,
        studentId: user?.id || '',
        createdAt: Date.now(),
        documentName: formData.document?.name,
        documentData: documentData,
        documentType: documentType
      };

      const saved = localStorage.getItem('leave_applications');
      const allApplications = saved ? JSON.parse(saved) : [];
      allApplications.unshift(newApplication);
      localStorage.setItem('leave_applications', JSON.stringify(allApplications));

      const adminNotifications = JSON.parse(localStorage.getItem('leave_notifications') || '[]');
      const newNotification = {
        id: `leave-admin-${Date.now()}`,
        title: `📋 New Leave Application`,
        message: `${studentInfo!.name} (${studentInfo!.registerNo}) has submitted a ${newApplication.type} application`,
        time: new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        unread: true,
        timestamp: Date.now()
      };
      adminNotifications.unshift(newNotification);
      localStorage.setItem('leave_notifications', JSON.stringify(adminNotifications.slice(0, 50)));

      setFormData({
        type: '',
        fromDate: '',
        toDate: '',
        reason: '',
        document: null
      });

      loadApplications();
      
      toast({
        title: "Success",
        description: "Leave application submitted successfully. You will be notified once reviewed."
      });
      
      setShowForm(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit application"
      });
    }
  };

  const handleViewDocument = (item: LeaveApplication) => {
    if (!item.documentData) {
      toast({
        variant: "destructive",
        title: "No Document",
        description: "No supporting document was uploaded with this application"
      });
      return;
    }

    // Open document in new tab
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${item.documentName || 'Document'}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              .header { margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #ddd; }
              .info { margin: 5px 0; color: #666; }
              iframe, img { max-width: 100%; height: calc(100vh - 150px); border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Supporting Document</h2>
              <div class="info"><strong>Student:</strong> ${item.studentName} (${item.rollNumber})</div>
              <div class="info"><strong>Leave Type:</strong> ${item.type}</div>
              <div class="info"><strong>File:</strong> ${item.documentName || 'Unknown'}</div>
            </div>
            ${item.documentType?.startsWith('image/') 
              ? `<img src="${item.documentData}" alt="Document" />` 
              : `<iframe src="${item.documentData}" width="100%" height="100%"></iframe>`
            }
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <StudentFinderWrapper />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-header mb-0">{isAdmin() ? 'Leave / OD Management' : 'Apply Leave / OD'}</h1>
        {!isAdmin() && (
          <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            New Application
          </Button>
        )}
      </div>

      {isAdmin() && (
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Search Student Leave Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input 
                  placeholder="Enter student roll number..." 
                  value={searchRollNumber}
                  onChange={(e) => setSearchRollNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleSearch} className="gradient-primary text-primary-foreground gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAdmin() && (
        <div className="flex gap-4 overflow-x-auto">
          <Card className="border-none shadow-card flex-shrink-0 min-w-[200px]">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Leave Eligible</p>
              <p className="text-3xl font-bold text-foreground mt-1">{stats.leaveEligible}</p>
              <p className="text-xs text-muted-foreground">days per semester</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-card flex-shrink-0 min-w-[200px]">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Personal Leave</p>
              <p className="text-3xl font-bold text-primary mt-1">{stats.personalLeave}</p>
              <p className="text-xs text-muted-foreground">approved</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-card flex-shrink-0 min-w-[200px]">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">On Duty (OD)</p>
              <p className="text-3xl font-bold text-success mt-1">{stats.onDuty}</p>
              <p className="text-xs text-muted-foreground">approved</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-card flex-shrink-0 min-w-[200px]">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Leave Pending</p>
              <p className="text-3xl font-bold text-destructive mt-1">{stats.leavePending}</p>
              <p className="text-xs text-muted-foreground">applications</p>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && !isAdmin() && (
        <Card className="border-none shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              New Leave / OD Application
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitApplication} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Application Type <span className="text-destructive">*</span></Label>
                <Select 
                  required 
                  value={formData.type}
                  onValueChange={(value) => setFormData({...formData, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                    <SelectItem value="od">On Duty (OD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>From Date <span className="text-destructive">*</span></Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.fromDate}
                  onChange={(e) => setFormData({...formData, fromDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date <span className="text-destructive">*</span></Label>
                <Input 
                  type="date" 
                  required 
                  value={formData.toDate}
                  onChange={(e) => setFormData({...formData, toDate: e.target.value})}
                  min={formData.fromDate}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Days <span className="text-destructive">*</span></Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={calculateDays(formData.fromDate, formData.toDate) || ''} 
                  placeholder="Auto-calculated" 
                  disabled 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea 
                  placeholder="Enter the reason for your leave/OD application..." 
                  rows={3} 
                  required 
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Supporting Document <span className="text-destructive">*</span></Label>
                <Input 
                  type="file" 
                  required 
                  onChange={(e) => setFormData({...formData, document: e.target.files?.[0] || null})}
                />
              </div>
              <div className="md:col-span-2 flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  Submit Application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {isAdmin() ? 'All Leave Applications' : 'Application History'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {isAdmin() && (
                    <>
                      <th>Student Name</th>
                      <th>Roll Number</th>
                    </>
                  )}
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="text-center">Days</th>
                  {isAdmin() && <th className="text-center">Document</th>}
                  <th>Reason</th>
                  <th className="text-center">Status</th>
                  {isAdmin() && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(isAdmin() ? filteredApplications : leaveApplications).length === 0 ? (
                  <tr>10
                    <td colSpan={isAdmin() ? 9 : 6} className="text-center py-8 text-muted-foreground">
                      No applications found
                    </td>
                  </tr>
                ) : (
                  (isAdmin() ? filteredApplications : leaveApplications).map((item) => (
                    <tr key={item.id}>
                      {isAdmin() && (
                        <>
                          <td className="font-medium">{item.studentName || 'N/A'}</td>
                          <td className="text-muted-foreground">{item.rollNumber || 'N/A'}</td>
                        </>
                      )}
                      <td>
                        <span className={`font-medium ${
                          item.type === "On Duty (OD)" ? "text-primary" : "text-foreground"
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="text-muted-foreground">{new Date(item.from).toLocaleDateString()}</td>
                      <td className="text-muted-foreground">{new Date(item.to).toLocaleDateString()}</td>
                      <td className="text-center font-medium">{item.days}</td>
                      {isAdmin() && (
                        <td className="text-center">
                          {item.documentName ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => handleViewDocument(item)}
                            >
                              <FileText className="w-3 h-3" />
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No document</span>
                          )}
                        </td>
                      )}
                      <td className="max-w-xs truncate">{item.reason}</td>
                      <td className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                      </td>
                      {isAdmin() && (
                        <td className="text-center">
                          {item.status === 'pending' && (
                            <div className="flex gap-2 justify-center">
                              <Button 
                                size="sm" 
                                onClick={() => handleApprove(item.id)}
                                className="bg-success hover:bg-success/90 text-white gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleReject(item.id)}
                                variant="destructive"
                                className="gap-1"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveOD;
