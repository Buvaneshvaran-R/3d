import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, X, Edit2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export const AdminAttendanceEditor = () => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState("Present");
  const [saving, setSaving] = useState(false);

  // Fetch subjects when student is selected
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedStudent) return;

      try {
        // Fetch only subjects enrolled by the selected student
        const { data, error } = await supabase
          .from('student_subjects')
          .select(`
            subject_id,
            subjects (
              id,
              code,
              name
            )
          `)
          .eq('student_id', selectedStudent.id);

        if (error) throw error;
        
        // Extract subjects from the join result
        const enrolledSubjects = data?.map(item => item.subjects).filter(Boolean) || [];
        setSubjects(enrolledSubjects);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    fetchSubjects();
  }, [selectedStudent]);

  const handleSaveAttendance = async () => {
    if (!selectedStudent || !selectedSubject || !attendanceDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Check if attendance already exists for this date
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', selectedStudent.id)
        .eq('subject_id', selectedSubject)
        .eq('date', attendanceDate)
        .single();

      if (existing) {
        // Update existing attendance
        const { error } = await supabase
          .from('attendance')
          .update({ status })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new attendance
        const { error } = await supabase
          .from('attendance')
          .insert({
            student_id: selectedStudent.id,
            subject_id: selectedSubject,
            date: attendanceDate,
            status
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Attendance updated successfully",
      });

      // Reset form
      setSelectedSubject("");
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setStatus("Present");
    } catch (error: Error | unknown) {
      console.error('Error saving attendance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Mark Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedStudent ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Please select a student to mark attendance</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                    <SelectItem value="Leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleSaveAttendance}
              disabled={saving || !selectedSubject}
              className="w-full md:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
