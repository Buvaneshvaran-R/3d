import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Upload, UserX, UserCheck, Loader2 } from "lucide-react";
import { StudentFinder, StudentSearchResult } from "@/components/admin/StudentFinder";
import { useAuth } from "@/contexts/AuthContext";
import StudentAchievements from "@/components/achievements/StudentAchievements";

interface Student {
  id: string;
  name: string;
  register_no: string;
  department: string;
  year: string;
}

export default function AdminAchievements() {
  const { toast } = useToast();
  const { selectedStudent, selectStudent: authSelectStudent } = useAuth();
  
  // Search state
  const [student, setStudent] = useState<Student | null>(null);

  // Sync selectedStudent from Context to local Component state
  useEffect(() => {
    if (selectedStudent) {
      setStudent({
        id: selectedStudent.id,
        name: selectedStudent.name,
        register_no: selectedStudent.register_no,
        department: selectedStudent.department || "N/A",
        year: selectedStudent.current_year?.toString() || "N/A"
      });
    } else {
      setStudent(null);
    }
  }, [selectedStudent]);

  
  // Form state
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [achievementType, setAchievementType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectStudentWrapper = (result: StudentSearchResult) => {
    // This updates the global context, which will then trigger the useEffect above
    authSelectStudent(result);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Max 5MB
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !eventName || !date || !achievementType) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      let certificate_url = null;

      // Upload file if exists
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${student.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('achievement-certificates')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;
        certificate_url = data.path;
      }

      // Insert achievement
      const { error: insertError } = await supabase
        .from('achievements')
        .insert({
          student_id: student.id,
          event_name: eventName,
          description,
          date_of_participation: date,
          achievement_type: achievementType,
          certificate_url
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Achievement added successfully",
      });

      // Reset form
      setEventName("");
      setDescription("");
      setDate("");
      setAchievementType("");
      setFile(null);
      setRefreshKey(prev => prev + 1);
      // Optional: don't reset student so we can add multiple?
      
    } catch (error: unknown) {
      console.error("Error adding achievement:", error);
      const message = error instanceof Error ? error.message : "Failed to add achievement";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* Search Card */}
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Find a student by register number or name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <StudentFinder onStudentSelect={selectStudentWrapper} />
          </div>

          {student && (
            <div className="p-4 border rounded-md bg-muted/30">
              <div className="flex items-center gap-3 mb-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-lg">{student.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mt-3">
                <div>Reg No: <span className="text-foreground font-medium">{student.register_no}</span></div>
                <div>Dept: <span className="text-foreground font-medium">{student.department}</span></div>
                <div>Year: <span className="text-foreground font-medium">{student.year}</span></div>
              </div>
            </div>
          )}

          {!student && (
            <div className="mt-6 text-center text-muted-foreground py-4">
              <UserX className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p>No student selected</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Achievement Form */}
      <Card className={`relative ${!student && 'opacity-50 pointer-events-none'}`}>
        {!student && (
          <div className="absolute inset-0 z-10 hidden md:block"></div>
        )}
        <CardHeader>
          <CardTitle>Add Achievement</CardTitle>
          <CardDescription>
            {student ? `Adding for ${student.name}` : "Select a student first"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="event">Event Name <span className="text-destructive">*</span></Label>
              <Input 
                id="event" 
                placeholder="e.g. National Hackathon 2024" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Achievement Type <span className="text-destructive">*</span></Label>
                <Select value={achievementType} onValueChange={setAchievementType} required>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Winner">Winner</SelectItem>
                    <SelectItem value="Runner Up">Runner Up</SelectItem>
                    <SelectItem value="Finalist">Finalist</SelectItem>
                    <SelectItem value="Participation">Participation</SelectItem>
                    <SelectItem value="Special Mention">Special Mention</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
                <Input 
                  id="date" 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Brief details about the achievement..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate">Certificate (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="certificate" 
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold"
                />
              </div>
              <p className="text-xs text-muted-foreground">PDF or Image (Max 5MB)</p>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting || !student}>
              {isSubmitting ? (
                "Saving..."
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" /> Add Achievement
                </>
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
      
      {student && (
        <div className="col-span-1 md:col-span-2 mt-6">
          <h2 className="text-xl font-bold mb-4">Student's Achievements</h2>
          <StudentAchievements key={refreshKey} studentId={student.id} />
        </div>
      )}
    </div>
  );
}
