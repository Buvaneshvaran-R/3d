import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, X, Loader2, Calendar as CalendarIcon, User, Mail, Phone, MapPin, GraduationCap, BookOpen, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Blood group options
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Gender options
const GENDERS = ['Male', 'Female', 'Other'];

// Departments (you can customize this based on your institution)
const DEPARTMENTS = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical and Electronics Engineering',
  'Information Technology',
  'Artificial Intelligence and Data Science',
  'Other'
];

// Branch options
const BRANCHES = [
  'General',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Science',
  'Computer Networks',
  'Cyber Security',
  'Software Engineering',
  'Cloud Computing',
  'Internet of Things',
  'Other'
];

// Credits range (0 to 200 in steps of 5)
const CREDITS_OPTIONS = Array.from({ length: 41 }, (_, i) => (i * 5).toString());

// Backlogs range (0 to 20)
const BACKLOGS_OPTIONS = Array.from({ length: 21 }, (_, i) => i.toString());

// Years and Semesters
const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

interface AdminStudentEditorProps {
  onClose?: () => void;
}

export const AdminStudentEditor = ({ onClose }: AdminStudentEditorProps) => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    registerNo: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    dateOfJoining: "",
    gender: "",
    bloodGroup: "",
    
    // Academic Information
    department: "",
    branch: "",
    currentYear: "",
    semester: "",
    batch: "",
    section: "",
    creditsEarned: "0",
    backlogs: "0",
    
    // Address Information
    permanentAddress: "",
    communicationAddress: "",
    
    // Parent/Guardian Information
    fatherName: "",
    fatherPhone: "",
    motherName: "",
    motherPhone: "",
    guardianName: "",
    guardianPhone: "",
  });

  useEffect(() => {
    const loadStudentData = async () => {
      if (!selectedStudent?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', selectedStudent.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            name: data.name || "",
            registerNo: data.register_no || "",
            email: data.email || "",
            phone: data.phone || "",
            dateOfBirth: data.date_of_birth || "",
            dateOfJoining: data.date_of_joining || "",
            gender: data.gender || "",
            bloodGroup: data.blood_group || "",
            department: data.department || "",
            branch: data.branch || "",
            currentYear: data.current_year?.toString() || "",
            semester: data.semester?.toString() || "",
            batch: data.batch || "",
            section: data.section || "",
            creditsEarned: data.credits_earned?.toString() || "0",
            backlogs: data.backlogs?.toString() || "0",
            permanentAddress: data.permanent_address || "",
            communicationAddress: data.communication_address || "",
            fatherName: data.father_name || "",
            fatherPhone: data.father_phone || "",
            motherName: data.mother_name || "",
            motherPhone: data.mother_phone || "",
            guardianName: data.guardian_name || "",
            guardianPhone: data.guardian_phone || "",
          });
          setPhotoUrl(data.photo_url || data.profile_photo_url || "");
        }
      } catch (error: Error | unknown) {
        console.error('Error loading student data:', error);
        toast({
          title: "Error",
          description: error?.message || "Failed to load student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [selectedStudent?.id, toast]);

  const handleSave = async () => {
    if (!selectedStudent?.id) {
      toast({
        title: "Error",
        description: "No student selected",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: formData.name || null,
          register_no: formData.registerNo || null,
          email: formData.email || null,
          phone: formData.phone || null,
          date_of_birth: formData.dateOfBirth || null,
          date_of_joining: formData.dateOfJoining || null,
          gender: formData.gender || null,
          blood_group: formData.bloodGroup || null,
          department: formData.department || null,
          branch: formData.branch || null,
          current_year: formData.currentYear ? parseInt(formData.currentYear) : null,
          semester: formData.semester ? parseInt(formData.semester) : null,
          batch: formData.batch || null,
          section: formData.section || null,
          credits_earned: formData.creditsEarned ? parseInt(formData.creditsEarned) : 0,
          backlogs: formData.backlogs ? parseInt(formData.backlogs) : 0,
          permanent_address: formData.permanentAddress || null,
          communication_address: formData.communicationAddress || null,
          father_name: formData.fatherName || null,
          father_phone: formData.fatherPhone || null,
          mother_name: formData.motherName || null,
          mother_phone: formData.motherPhone || null,
          guardian_name: formData.guardianName || null,
          guardian_phone: formData.guardianPhone || null,
        })
        .eq('id', selectedStudent.id);

  if (error) throw error;

      toast({
        title: "Success",
        description: "Student information updated successfully",
      });

      if (onClose) onClose();
    } catch (error: Error | unknown) {
      console.error('Error saving student data:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save student data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedStudent?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStudent.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      console.log('Photo uploaded, publicUrl:', publicUrl);

      // Update student record with photo URL
      const { error: updateError } = await supabase
        .from('students')
        .update({ 
          photo_url: publicUrl,
          profile_photo_url: publicUrl 
        })
        .eq('id', selectedStudent.id);

      if (updateError) throw updateError;

      console.log('Database updated with photo URL for student ID:', selectedStudent.id);

      // Get student's user_id for notification
      const { data: studentData } = await supabase
        .from('students')
        .select('user_id, name')
        .eq('id', selectedStudent.id)
        .single();

      // Create notification for student
      if (studentData?.user_id) {
        const studentNotifications = JSON.parse(
          localStorage.getItem(`student_notifications_${studentData.user_id}`) || '[]'
        );
        
        const newNotification = {
          id: `photo-update-${Date.now()}`,
          title: `📸 Profile Photo Updated`,
          message: `Your profile photo has been updated by admin`,
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
        localStorage.setItem(
          `student_notifications_${studentData.user_id}`, 
          JSON.stringify(studentNotifications.slice(0, 50))
        );
      }

      setPhotoUrl(publicUrl);

      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error: Error | unknown) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload photo. Please ensure the storage bucket exists.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const DatePickerField = ({ 
    label, 
    field, 
    icon: Icon 
  }: { 
    label: string; 
    field: keyof typeof formData; 
    icon: React.ComponentType<{ className: string }>;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !formData[field] && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formData[field] ? format(new Date(formData[field]), "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={formData[field] ? new Date(formData[field]) : undefined}
            onSelect={(date) => {
              if (date) {
                handleChange(field, format(date, "yyyy-MM-dd"));
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  if (!selectedStudent) {
    return (
      <Card className="border-none shadow-card">
        <CardContent className="p-12 text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Student Selected</h3>
          <p className="text-muted-foreground">Please select a student to edit their information</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-none shadow-card">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading student information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Edit Student Information</h2>
          <p className="text-muted-foreground mt-1">
            Updating information for {selectedStudent.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={saving} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-lg">
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Student Photo" 
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center">
                <User className="w-16 h-16 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col items-center gap-2">
              <Label 
                htmlFor="photo-upload" 
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </>
                )}
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground text-center">Max 5MB • JPG, PNG, WEBP</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Full Name *
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter full name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Register Number *
            </Label>
            <Input
              value={formData.registerNo}
              onChange={(e) => handleChange("registerNo", e.target.value)}
              placeholder="Enter register number"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <Mail className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Email Address *
            </Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter email address"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <Phone className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Phone Number
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
          
          <DatePickerField label="Date of Birth" field="dateOfBirth" icon={CalendarIcon} />
          <DatePickerField label="Date of Joining" field="dateOfJoining" icon={CalendarIcon} />
          
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Gender
            </Label>
            <Select value={formData.gender} onValueChange={(val) => handleChange("gender", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Blood Group
            </Label>
            <Select value={formData.bloodGroup} onValueChange={(val) => handleChange("bloodGroup", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((bg) => (
                  <SelectItem key={bg} value={bg}>
                    {bg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Academic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              <GraduationCap className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Department
            </Label>
            <Select value={formData.department} onValueChange={(val) => handleChange("department", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <BookOpen className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Branch / Specialization
            </Label>
            <Select value={formData.branch} onValueChange={(val) => handleChange("branch", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <GraduationCap className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Current Year
            </Label>
            <Select value={formData.currentYear} onValueChange={(val) => handleChange("currentYear", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    Year {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <BookOpen className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Current Semester
            </Label>
            <Select value={formData.semester} onValueChange={(val) => handleChange("semester", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((sem) => (
                  <SelectItem key={sem} value={sem}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <GraduationCap className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Batch
            </Label>
            <Input
              value={formData.batch}
              onChange={(e) => handleChange("batch", e.target.value)}
              placeholder="e.g., 2020-2024"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <BookOpen className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Section
            </Label>
            <Input
              value={formData.section}
              onChange={(e) => handleChange("section", e.target.value)}
              placeholder="e.g., A, B, C"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <GraduationCap className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Credits Earned
            </Label>
            <Select value={formData.creditsEarned} onValueChange={(val) => handleChange("creditsEarned", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select credits" />
              </SelectTrigger>
              <SelectContent>
                {CREDITS_OPTIONS.map((credit) => (
                  <SelectItem key={credit} value={credit}>
                    {credit} credits
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              <BookOpen className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Number of Backlogs
            </Label>
            <Select value={formData.backlogs} onValueChange={(val) => handleChange("backlogs", val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select backlogs" />
              </SelectTrigger>
              <SelectContent>
                {BACKLOGS_OPTIONS.map((backlog) => (
                  <SelectItem key={backlog} value={backlog}>
                    {backlog} {backlog === "1" ? "backlog" : "backlogs"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              <MapPin className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Permanent Address
            </Label>
            <Textarea
              value={formData.permanentAddress}
              onChange={(e) => handleChange("permanentAddress", e.target.value)}
              placeholder="Enter permanent address"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <MapPin className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Communication Address
            </Label>
            <Textarea
              value={formData.communicationAddress}
              onChange={(e) => handleChange("communicationAddress", e.target.value)}
              placeholder="Enter communication address"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parent/Guardian Information */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Parent / Guardian Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Father's Name
            </Label>
            <Input
              value={formData.fatherName}
              onChange={(e) => handleChange("fatherName", e.target.value)}
              placeholder="Enter father's name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <Phone className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Father's Phone Number
            </Label>
            <Input
              value={formData.fatherPhone}
              onChange={(e) => handleChange("fatherPhone", e.target.value)}
              placeholder="Enter father's phone"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Mother's Name
            </Label>
            <Input
              value={formData.motherName}
              onChange={(e) => handleChange("motherName", e.target.value)}
              placeholder="Enter mother's name"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <Phone className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Mother's Phone Number
            </Label>
            <Input
              value={formData.motherPhone}
              onChange={(e) => handleChange("motherPhone", e.target.value)}
              placeholder="Enter mother's phone"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <User className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Guardian Name
            </Label>
            <Input
              value={formData.guardianName}
              onChange={(e) => handleChange("guardianName", e.target.value)}
              placeholder="Enter guardian's name (if different)"
            />
          </div>
          
          <div className="space-y-2">
            <Label>
              <Phone className="w-4 h-4 inline mr-2 text-muted-foreground" />
              Guardian Phone Number
            </Label>
            <Input
              value={formData.guardianPhone}
              onChange={(e) => handleChange("guardianPhone", e.target.value)}
              placeholder="Enter guardian's phone"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStudentEditor;
