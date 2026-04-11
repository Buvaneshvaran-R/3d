import { StudentFinderWrapper } from "@/components/admin/StudentFinderWrapper";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Plus, CheckCircle2, Clock, Download, FileText, Search, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface CertificateRequest {
  id: string;
  type: string;
  copies: number;
  purpose: string;
  notes: string;
  status: 'processing' | 'ready' | 'collected';
  studentName: string;
  rollNumber: string;
  studentId: string;
  createdAt: number;
  collectedOn: number | null;
}

const certificateTypes = [
  "Bonafide Certificate",
  "Course Completion Certificate",
  "Character Certificate",
  "Transfer Certificate",
  "Medium of Instruction",
  "Rank Certificate",
  "Conduct Certificate",
];

const Certificates = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [searchRollNumber, setSearchRollNumber] = useState("");
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CertificateRequest[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ name: string; registerNo: string } | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    copies: '1',
    purpose: '',
    notes: ''
  });

  useEffect(() => {
    if (user && !isAdmin()) {
      fetchStudentInfo();
    }
    if (user) {
      loadRequests();
      const interval = setInterval(loadRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [user, isAdmin]);

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

  const loadRequests = () => {
    try {
      const saved = localStorage.getItem('certificate_requests');
      if (saved) {
        const allRequests: CertificateRequest[] = JSON.parse(saved);
        
        if (isAdmin()) {
          setCertificateRequests(allRequests);
          setFilteredRequests(allRequests);
        } else {
          const myRequests = allRequests.filter(
            req => req.studentId === user?.id
          );
          setCertificateRequests(myRequests);
        }
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const getCertificateStats = () => {
    const ready = certificateRequests.filter(req => req.status === 'ready').length;
    const processing = certificateRequests.filter(req => req.status === 'processing').length;
    const collected = certificateRequests.filter(req => req.status === 'collected').length;
    
    return { ready, processing, totalIssued: ready + collected };
  };

  const stats = getCertificateStats();

  const handleMarkReady = (requestId: string) => {
    try {
      const saved = localStorage.getItem('certificate_requests');
      if (saved) {
        const allRequests: CertificateRequest[] = JSON.parse(saved);
        const updatedRequests = allRequests.map(req => 
          req.id === requestId ? { ...req, status: 'ready' as const } : req
        );
        localStorage.setItem('certificate_requests', JSON.stringify(updatedRequests));
        
        const request = allRequests.find(req => req.id === requestId);
        if (request) {
          const studentNotifications = JSON.parse(localStorage.getItem(`student_notifications_${request.studentId}`) || '[]');
          const newNotification = {
            id: `cert-ready-${Date.now()}`,
            title: `✅ Certificate Ready`,
            message: `Your ${request.type} certificate is ready for collection`,
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
          localStorage.setItem(`student_notifications_${request.studentId}`, JSON.stringify(studentNotifications.slice(0, 50)));
        }
        
        loadRequests();
        toast({
          title: "Success",
          description: "Certificate marked as ready for collection"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    }
  };

  const handleMarkCollected = (requestId: string) => {
    try {
      const saved = localStorage.getItem('certificate_requests');
      if (saved) {
        const allRequests: CertificateRequest[] = JSON.parse(saved);
        const updatedRequests = allRequests.map(req => 
          req.id === requestId ? { ...req, status: 'collected' as const, collectedOn: Date.now() } : req
        );
        localStorage.setItem('certificate_requests', JSON.stringify(updatedRequests));
        
        loadRequests();
        toast({
          title: "Success",
          description: "Certificate marked as collected"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status"
      });
    }
  };

  const handleSearch = () => {
    if (!searchRollNumber.trim()) {
      setFilteredRequests(certificateRequests);
      return;
    }
    
    const filtered = certificateRequests.filter(req => 
      req.rollNumber.toLowerCase().includes(searchRollNumber.toLowerCase())
    );
    
    if (filtered.length === 0) {
      toast({
        variant: "destructive",
        title: "No Results",
        description: `No requests found for roll number: ${searchRollNumber}`
      });
    }
    
    setFilteredRequests(filtered);
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.purpose) {
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

    // Check if student has any pending (processing) requests
    const hasPendingRequest = certificateRequests.some(
      req => req.studentId === user?.id && req.status === 'processing'
    );

    if (hasPendingRequest) {
      toast({
        variant: "destructive",
        title: "Pending Request Exists",
        description: "You cannot submit a new certificate request while you have a pending request being processed. Please wait for the current request to be completed."
      });
      return;
    }

    try {
      const newRequest: CertificateRequest = {
        id: `cert-${Date.now()}`,
        type: formData.type,
        copies: parseInt(formData.copies),
        purpose: formData.purpose,
        notes: formData.notes,
        status: 'processing',
        studentName: studentInfo.name,
        rollNumber: studentInfo.registerNo,
        studentId: user?.id || '',
        createdAt: Date.now(),
        collectedOn: null
      };

      const saved = localStorage.getItem('certificate_requests');
      const allRequests = saved ? JSON.parse(saved) : [];
      allRequests.unshift(newRequest);
      localStorage.setItem('certificate_requests', JSON.stringify(allRequests));

      const adminNotifications = JSON.parse(localStorage.getItem('certificate_notifications') || '[]');
      const newNotification = {
        id: `cert-admin-${Date.now()}`,
        title: `📜 New Certificate Request`,
        message: `${studentInfo.name} (${studentInfo.registerNo}) has requested a ${newRequest.type}`,
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
      localStorage.setItem('certificate_notifications', JSON.stringify(adminNotifications.slice(0, 50)));

      setFormData({
        type: '',
        copies: '1',
        purpose: '',
        notes: ''
      });

      loadRequests();
      
      toast({
        title: "Success",
        description: "Certificate request submitted successfully. You will be notified when it's ready."
      });
      
      setShowForm(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit request"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return { class: "bg-success/10 text-success", icon: CheckCircle2, text: "Ready for Collection" };
      case "processing":
        return { class: "bg-warning/10 text-warning", icon: Clock, text: "Processing" };
      case "collected":
        return { class: "bg-muted text-muted-foreground", icon: Download, text: "Collected" };
      default:
        return { class: "", icon: Clock, text: status };
    }
  };

  const displayRequests = isAdmin() ? filteredRequests : certificateRequests;

  return (
    <div className="space-y-6 animate-fade-in">
      <StudentFinderWrapper />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-header mb-0">{isAdmin() ? 'Certificate Management' : 'Apply Certificates'}</h1>
        {!isAdmin() && (
          <Button onClick={() => setShowForm(!showForm)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        )}
      </div>

      {isAdmin() && (
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Search Student Certificate Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Enter student roll number..."
                value={searchRollNumber}
                onChange={(e) => setSearchRollNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
              {searchRollNumber && (
                <Button variant="outline" onClick={() => {
                  setSearchRollNumber("");
                  setFilteredRequests(certificateRequests);
                }}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {!isAdmin() && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ready for Collection</p>
                  <p className="text-3xl font-bold text-success mt-2">{stats.ready}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-3xl font-bold text-warning mt-2">{stats.processing}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="w-7 h-7 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Issued</p>
                  <p className="text-3xl font-bold text-primary mt-2">{stats.totalIssued}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Award className="w-7 h-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Application Form */}
      {showForm && !isAdmin() && (
        <Card className="border-none shadow-card animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              New Certificate Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Certificate Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select certificate type" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificateTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of Copies</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="5" 
                  value={formData.copies}
                  onChange={(e) => setFormData({...formData, copies: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Purpose</Label>
                <Textarea 
                  placeholder="Enter the purpose for requesting this certificate..." 
                  rows={2}
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea 
                  placeholder="Any additional information..." 
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="md:col-span-2 flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="gradient-primary text-primary-foreground">
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Certificate History */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {isAdmin() ? 'All Certificate Requests' : 'Certificate Request History'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {displayRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No certificate requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    {isAdmin() && <th>Student</th>}
                    {isAdmin() && <th>Roll Number</th>}
                    <th>Certificate Type</th>
                    <th>Copies</th>
                    <th>Purpose</th>
                    <th>Applied On</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRequests.map((item) => {
                    const status = getStatusBadge(item.status);
                    return (
                      <tr key={item.id}>
                        {isAdmin() && <td className="font-medium">{item.studentName}</td>}
                        {isAdmin() && <td className="text-muted-foreground">{item.rollNumber}</td>}
                        <td className="font-medium">{item.type}</td>
                        <td className="text-muted-foreground">{item.copies}</td>
                        <td className="text-muted-foreground max-w-xs truncate" title={item.purpose}>{item.purpose}</td>
                        <td className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.class}`}>
                            <status.icon className="w-3 h-3 mr-1" />
                            {status.text}
                          </span>
                        </td>
                        <td className="text-center">
                          {isAdmin() ? (
                            <div className="flex gap-2 justify-center">
                              {item.status === 'processing' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleMarkReady(item.id)}
                                  className="gap-1 text-success border-success hover:bg-success hover:text-success-foreground"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark Ready
                                </Button>
                              )}
                              {item.status === 'ready' && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleMarkCollected(item.id)}
                                  className="gap-1"
                                >
                                  <Download className="w-3 h-3" />
                                  Mark Collected
                                </Button>
                              )}
                              {item.status === 'collected' && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.collectedOn!).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              {item.status === "ready" && (
                                <span className="text-xs text-success font-medium">Ready to collect</span>
                              )}
                              {item.status === "collected" && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.collectedOn!).toLocaleDateString()}
                                </span>
                              )}
                              {item.status === "processing" && (
                                <span className="text-xs text-muted-foreground">2-3 days</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Certificates;
