import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SubjectReg {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  credits: number;
  type: string;
}

const SubjectRegistration = () => {
  const { isAdmin, user, selectedStudent } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<SubjectReg[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; code: string; name: string; credits: number }>>([]);;
  const [selectedSubject, setSelectedSubject] = useState("");
  const [credits, setCredits] = useState("3");
  const [type, setType] = useState("Core");

  useEffect(() => {
    loadRegistrations();
    if (isAdmin()) {
      loadAvailableSubjects();
    }
    const interval = setInterval(loadRegistrations, 3000);
    return () => clearInterval(interval);
  }, [user, selectedStudent]);

  const loadRegistrations = async () => {
    try {
      let studentId;
      
      if (isAdmin() && selectedStudent) {
        studentId = selectedStudent.id;
      } else if (user) {
        const { data } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', user.id)
          .single();
        studentId = data?.id;
      }

      if (studentId) {
        const saved = localStorage.getItem(`subject_registrations_${studentId}`);
        if (saved) {
          setRegistrations(JSON.parse(saved));
        } else {
          setRegistrations([]);
        }
      }
    } catch (error) {
      console.error('Error loading registrations:', error);
    }
  };

  const loadAvailableSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const handleAddSubject = () => {
    if (!selectedSubject || !isAdmin() || !selectedStudent) return;

    const subject = availableSubjects.find(s => s.id === selectedSubject);
    if (!subject) return;

    // Check if already registered
    if (registrations.some(r => r.subjectId === selectedSubject)) {
      toast({
        title: "Already Registered",
        description: "This subject is already registered.",
        variant: "destructive"
      });
      return;
    }

    const newReg: SubjectReg = {
      id: `${Date.now()}-${Math.random()}`,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      credits: parseInt(credits),
      type
    };

    const updated = [...registrations, newReg];
    setRegistrations(updated);
    localStorage.setItem(`subject_registrations_${selectedStudent.id}`, JSON.stringify(updated));

    // Also update student_subjects table for attendance/marks
    supabase
      .from('student_subjects')
      .insert({
        student_id: selectedStudent.id,
        subject_id: subject.id,
        semester: parseInt(selectedStudent.semester) || 1,
        academic_year: new Date().getFullYear().toString()
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error inserting into student_subjects:', error);
        }
        toast({
          title: "Subject Added",
          description: `${subject.name} has been registered successfully.`
        });
      });

    setSelectedSubject("");
    setCredits("3");
    setType("Core");
  };

  const handleDelete = (id: string) => {
    if (!isAdmin() || !selectedStudent) return;

    const updated = registrations.filter(r => r.id !== id);
    setRegistrations(updated);
    localStorage.setItem(`subject_registrations_${selectedStudent.id}`, JSON.stringify(updated));

    toast({
      title: "Subject Removed",
      description: "Subject registration has been removed."
    });
  };

  const totalCredits = registrations.reduce((acc, sub) => acc + sub.credits, 0);
  const coreSubjects = registrations.filter(s => s.type === "Core").length;
  const electiveSubjects = registrations.filter(s => s.type === "Elective").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-header mb-0">Subject Registration</h1>
        {registrations.length > 0 && (
          <Badge variant="outline" className="text-success border-success w-fit">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {registrations.length} Subjects Registered
          </Badge>
        )}
      </div>

      {/* Admin Editor */}
      {isAdmin() && selectedStudent && (
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle>Register New Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credits</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Elective">Elective</SelectItem>
                    <SelectItem value="Lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddSubject} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Credits</p>
            <p className="text-3xl font-bold text-foreground mt-1">{totalCredits}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Core Subjects</p>
            <p className="text-3xl font-bold text-primary mt-1">{coreSubjects}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Electives</p>
            <p className="text-3xl font-bold text-success mt-1">{electiveSubjects}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Lab Courses</p>
            <p className="text-3xl font-bold text-warning mt-1">{registrations.filter(s => s.type === "Lab").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Registered Subjects Table */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Registered Subjects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Subject Name</th>
                  <th className="text-center">Credits</th>
                  <th className="text-center">Type</th>
                  {isAdmin() && <th className="text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {registrations.map((subject) => (
                  <tr key={subject.id}>
                    <td className="font-mono font-medium text-primary">{subject.subjectCode}</td>
                    <td className="font-medium">{subject.subjectName}</td>
                    <td className="text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted font-semibold">
                        {subject.credits}
                      </span>
                    </td>
                    <td className="text-center">
                      <Badge variant={
                        subject.type === "Core" ? "default" :
                        subject.type === "Elective" ? "secondary" : "outline"
                      }>
                        {subject.type}
                      </Badge>
                    </td>
                    {isAdmin() && (
                      <td className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(subject.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {registrations.length === 0 && (
            <div className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {isAdmin() 
                  ? "No subjects registered yet. Add subjects using the form above."
                  : "No subjects registered yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectRegistration;
