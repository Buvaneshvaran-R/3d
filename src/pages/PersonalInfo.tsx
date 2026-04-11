import { useState, useEffect, useCallback, memo } from "react";
import { User, Mail, Phone, MapPin, Calendar as CalendarIcon, GraduationCap, BookOpen, Building, Edit2, Save, X, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { StudentFinder } from "@/components/admin/StudentFinder";

// Blood group options
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Branch options (customize based on your institution)
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

// Generate admission years (last 20 years)
const ADMISSION_YEARS = Array.from({ length: 20 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return year.toString();
});

// Memoized InfoRow component to prevent unnecessary re-renders
const InfoRow = memo(({ 
  icon: Icon, 
  label, 
  value, 
  field, 
  isDateField,
  isSelectField,
  selectOptions,
  isEditing, 
  isRequired,
  onFieldChange 
}: { 
  icon: React.ComponentType<{ className: string }>; 
  label: string; 
  value: string; 
  field: string; 
  isDateField?: boolean;
  isSelectField?: boolean;
  selectOptions?: string[];
  isEditing: boolean;
  isRequired?: boolean;
  onFieldChange: (field: string, value: string) => void;
}) => (
  <div className="flex items-start gap-4 py-4 border-b border-border last:border-0">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-muted-foreground">
        {label}
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </p>
      {isEditing ? (
        isDateField ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full mt-1 h-9 justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? value : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => {
                  if (date) {
                    onFieldChange(field, format(date, "yyyy-MM-dd"));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : isSelectField && selectOptions ? (
          <Select value={value || ""} onValueChange={(val) => onFieldChange(field, val)}>
            <SelectTrigger className="mt-1 h-9">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={value}
            onChange={(e) => onFieldChange(field, e.target.value)}
            placeholder="Enter details"
            className="mt-1 h-9"
          />
        )
      ) : (
        <p className="font-medium text-foreground mt-0.5">{value || <span className="text-muted-foreground italic">Enter the details</span>}</p>
      )}
    </div>
  </div>
));

InfoRow.displayName = 'InfoRow';

  const PersonalInfo = () => {
  const { isAdmin, selectedStudent, selectStudent, user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    registerNo: "",
    department: "",
    branch: "",
    year: "",
    semester: "",
    email: "",
    phone: "",
    dob: "",
    dateOfJoining: "",
    bloodGroup: "",
    permanentAddress: "",
    communicationAddress: "",
    fatherName: "",
    fatherPhone: "",
    motherName: "",
    motherPhone: "",
    guardianName: "",
    guardianPhone: "",
    admissionYear: "",
    batch: "",
    creditsEarned: "",
    backlogs: "",
    photoUrl: "",
  });
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());
  const [studentTableId, setStudentTableId] = useState<string | null>(null);

  // Load student data from database
  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      try {
        // Determine which student to query
        let query = supabase.from('students').select('*');
        
        if (isAdmin() && selectedStudent?.id) {
          // Admin viewing a selected student - use student table id
          query = query.eq('id', selectedStudent.id);
        } else if (user?.id) {
          // Student viewing their own data - use user_id
          query = query.eq('user_id', user.id);
        } else {
          setLoading(false);
          return;
        }

        const { data, error } = await query.single();

        if (error) throw error;

        if (data) {
          // Store the student's table id for subscription
          setStudentTableId(data.id);
          
          // Always update photo URL even when editing
          const newPhotoUrl = data.photo_url || "";
          console.log('📸 loadStudentData - Photo URL:', { 
            studentId: data.id,
            current: studentInfo.photoUrl, 
            fromDB: newPhotoUrl,
            changed: newPhotoUrl !== studentInfo.photoUrl,
            timestamp: new Date().toISOString()
          });
          
          if (newPhotoUrl !== studentInfo.photoUrl) {
            console.log('✅ Photo URL CHANGED - updating timestamp');
            setPhotoTimestamp(Date.now());
          }
          
          // Only update form fields if not editing
          if (!isEditing) {
            setStudentInfo({
              name: data.name || "",
              registerNo: data.register_no || "",
              department: data.department || "",
              branch: data.branch || "",
              year: data.current_year ? `Year ${data.current_year}` : "",
              semester: data.semester ? `Semester ${data.semester}` : "",
              email: data.email || "",
              phone: data.phone || "",
              dob: data.date_of_birth || "",
              dateOfJoining: data.date_of_joining || "",
              bloodGroup: data.blood_group || "",
              permanentAddress: data.permanent_address || "",
              communicationAddress: data.communication_address || "",
              fatherName: data.father_name || "",
              fatherPhone: data.father_phone || "",
              motherName: data.mother_name || "",
              motherPhone: data.mother_phone || "",
              guardianName: data.guardian_name || "",
              guardianPhone: data.guardian_phone || "",
              admissionYear: "", // Not in schema
              batch: data.batch || "",
              creditsEarned: data.credits_earned?.toString() || "",
              backlogs: data.backlogs?.toString() || "",
              photoUrl: newPhotoUrl,
            });
          } else {
            // Update only photo URL when editing
            setStudentInfo(prev => ({ ...prev, photoUrl: newPhotoUrl }));
          }
        }
      } catch (error) {
        console.error('Error loading student data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [user, selectedStudent, isEditing]);

  // Set up realtime subscription - use student's table id
  useEffect(() => {
    if (!studentTableId) return;

    console.log(`🔴 Setting up real-time subscription: id=eq.${studentTableId}`);
    
    const channel = supabase
      .channel('personal-info-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `id=eq.${studentTableId}`,
        },
        (payload) => {
          console.log('=== Real-time update received ===');
          console.log('Payload:', payload);
          console.log('Old photo_url:', payload.old?.photo_url);
          console.log('New photo_url:', payload.new?.photo_url);
          console.log('================================');
          
          // Force immediate update
          if (payload.new?.photo_url) {
            setStudentInfo(prev => ({ ...prev, photoUrl: payload.new.photo_url }));
            setPhotoTimestamp(Date.now());
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [studentTableId]);

  const handleSave = async () => {
    // Validate required fields (except guardian name and phone)
    const requiredFields = [
      { field: 'name', label: 'Name' },
      { field: 'registerNo', label: 'Register Number' },
      { field: 'department', label: 'Department' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Phone' },
      { field: 'dob', label: 'Date of Birth' },
      { field: 'dateOfJoining', label: 'Date of Joining' },
      { field: 'bloodGroup', label: 'Blood Group' },
      { field: 'branch', label: 'Branch' },
      { field: 'permanentAddress', label: 'Permanent Address' },
      { field: 'communicationAddress', label: 'Communication Address' },
      { field: 'fatherName', label: "Father's Name" },
      { field: 'fatherPhone', label: "Father's Phone" },
      { field: 'motherName', label: "Mother's Name" },
      { field: 'motherPhone', label: "Mother's Phone" },
    ];

    const missingFields = requiredFields.filter(({ field }) => !studentInfo[field as keyof typeof studentInfo]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Determine which student to update
      const query = supabase.from('students');
      
      // Extract year and semester numbers from strings like "Year 2" and "Semester 4"
      const yearMatch = studentInfo.year.match(/\d+/);
      const semesterMatch = studentInfo.semester.match(/\d+/);

      const updateData = {
        name: studentInfo.name,
        register_no: studentInfo.registerNo,
        department: studentInfo.department,
        email: studentInfo.email,
        phone: studentInfo.phone,
        date_of_birth: studentInfo.dob,
        date_of_joining: studentInfo.dateOfJoining,
        blood_group: studentInfo.bloodGroup,
        branch: studentInfo.branch,
        batch: studentInfo.batch || null,
        current_year: yearMatch ? parseInt(yearMatch[0]) : null,
        semester: semesterMatch ? parseInt(semesterMatch[0]) : null,
        permanent_address: studentInfo.permanentAddress,
        communication_address: studentInfo.communicationAddress,
        father_name: studentInfo.fatherName,
        father_phone: studentInfo.fatherPhone,
        mother_name: studentInfo.motherName,
        mother_phone: studentInfo.motherPhone,
        guardian_name: studentInfo.guardianName || null,
        guardian_phone: studentInfo.guardianPhone || null,
        credits_earned: studentInfo.creditsEarned ? parseInt(studentInfo.creditsEarned) : 0,
        backlogs: studentInfo.backlogs ? parseInt(studentInfo.backlogs) : 0,
      };

      let error;
      if (isAdmin() && selectedStudent?.id) {
        // Admin updating a selected student - use student table id
        const result = await query.update(updateData).eq('id', selectedStudent.id);
        error = result.error;
      } else if (user?.id) {
        // Student updating their own data - use user_id
        const result = await query.update(updateData).eq('user_id', user.id);
        error = result.error;
      } else {
        toast({
          title: "Error",
          description: "No student selected",
          variant: "destructive",
        });
        return;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });

      setIsEditing(false);
    } catch (error: Error | unknown) {
      console.error('Error saving student data:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update personal information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = useCallback((field: string, value: string) => {
    setStudentInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Determine student ID
      const studentIdForUpload = isAdmin() && selectedStudent?.id ? selectedStudent.id : user?.id;
      if (!studentIdForUpload) {
        throw new Error("No student ID available");
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentIdForUpload}_${Date.now()}.${fileExt}`;
      const filePath = `student-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      // Update student record with photo URL
      const updateQuery = supabase.from('students').update({ photo_url: publicUrl });
      
      if (isAdmin() && selectedStudent?.id) {
        await updateQuery.eq('id', selectedStudent.id);
      } else if (user?.id) {
        await updateQuery.eq('user_id', user.id);
      }

      // Update local state
      setStudentInfo(prev => ({ ...prev, photoUrl: publicUrl }));

      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error: Error | unknown) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {isAdmin() && (
        <div className="mb-6">
          <StudentFinder onStudentSelect={selectStudent} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="page-header mb-0">Personal Information</h1>
        {isAdmin() && selectedStudent && (
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving} className="gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Information
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border-none shadow-card lg:col-span-1">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary/20" key={Date.now()}>
                {studentInfo.photoUrl ? (
                  <AvatarImage 
                    src={`${studentInfo.photoUrl}?t=${Date.now()}`} 
                    onLoad={() => console.log('Image loaded:', studentInfo.photoUrl)}
                    onError={() => console.error('Image failed to load:', studentInfo.photoUrl)}
                  />
                ) : (
                  <AvatarFallback className="bg-muted flex flex-col items-center justify-center">
                    <User className="w-12 h-12 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Photo not</span>
                    <span className="text-xs text-muted-foreground">uploaded</span>
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center">
                <span className="text-xs font-bold text-success-foreground">{studentInfo.bloodGroup || 'A+'}</span>
              </div>
              {isAdmin() && isEditing && (
                <div className="absolute top-0 right-0">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-8 h-8 rounded-full p-0"
                      disabled={uploading}
                      asChild
                    >
                      <span className="cursor-pointer">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Edit2 className="w-4 h-4" />
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-foreground mt-6">{studentInfo.name}</h2>
            <p className="text-muted-foreground text-sm mt-1">{studentInfo.registerNo}</p>
            
            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10">
                <GraduationCap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {studentInfo.department}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-muted">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {studentInfo.year} • {studentInfo.semester}
                </span>
              </div>
            </div>

            <div className="w-full mt-6 p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">Batch</p>
              <p className="font-semibold text-foreground">{studentInfo.batch}</p>
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="border-none shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow icon={Mail} label="Email Address" value={studentInfo.email} field="email" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={Phone} label="Phone Number" value={studentInfo.phone} field="phone" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={CalendarIcon} label="Date of Birth" value={studentInfo.dob} field="dob" isDateField={true} isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={CalendarIcon} label="Date of Joining" value={studentInfo.dateOfJoining} field="dateOfJoining" isDateField={true} isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={User} label="Blood Group" value={studentInfo.bloodGroup} field="bloodGroup" isSelectField={true} selectOptions={BLOOD_GROUPS} isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={Building} label="Branch / Specialization" value={studentInfo.branch} field="branch" isSelectField={true} selectOptions={BRANCHES} isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={MapPin} label="Permanent Address" value={studentInfo.permanentAddress} field="permanentAddress" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={MapPin} label="Communication Address" value={studentInfo.communicationAddress} field="communicationAddress" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
          </CardContent>
        </Card>

        {/* Parent Details */}
        <Card className="border-none shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Parent / Guardian Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <InfoRow icon={User} label="Father's Name" value={studentInfo.fatherName} field="fatherName" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={Phone} label="Father's Phone" value={studentInfo.fatherPhone} field="fatherPhone" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={User} label="Mother's Name" value={studentInfo.motherName} field="motherName" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={Phone} label="Mother's Phone" value={studentInfo.motherPhone} field="motherPhone" isRequired isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={User} label="Guardian Name" value={studentInfo.guardianName} field="guardianName" isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={Phone} label="Guardian Phone" value={studentInfo.guardianPhone} field="guardianPhone" isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card className="border-none shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <InfoRow icon={BookOpen} label="Current Semester" value={studentInfo.semester} field="semester" isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={GraduationCap} label="Credits Earned" value={studentInfo.creditsEarned} field="creditsEarned" isSelectField={true} selectOptions={CREDITS_OPTIONS} isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
            <InfoRow icon={BookOpen} label="Number of Backlogs" value={studentInfo.backlogs} field="backlogs" isSelectField={true} selectOptions={BACKLOGS_OPTIONS} isEditing={isEditing && isAdmin()} onFieldChange={handleFieldChange} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PersonalInfo;
