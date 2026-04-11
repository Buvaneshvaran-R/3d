import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export const AdminGradeEditor = () => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [manualGrades, setManualGrades] = useState<Record<string, string>>({});
  const [selectedSubject, setSelectedSubject] = useState("");
  const [grade, setGrade] = useState("");

  const gradeOptions = ["O", "A+", "A", "B+", "B", "C", "U"];

  useEffect(() => {
    if (selectedStudent) {
      fetchSubjects();
      loadGrades();
    }
  }, [selectedStudent]);

  const fetchSubjects = async () => {
    try {
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
        .eq('student_id', selectedStudent?.id);

      if (error) throw error;
      const enrolledSubjects = data?.map(item => item.subjects).filter(Boolean) as any;
      setSubjects(enrolledSubjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const loadGrades = () => {
    try {
      const saved = localStorage.getItem(`manual_grades_${selectedStudent?.id}`);
      if (saved) {
        setManualGrades(JSON.parse(saved));
      } else {
        setManualGrades({});
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const handleSave = () => {
    if (!selectedStudent || !selectedSubject || !grade) {
      toast({
        title: "Missing Information",
        description: "Please select a subject and a grade.",
        variant: "destructive",
      });
      return;
    }

    const updated = { ...manualGrades, [selectedSubject]: grade };
    localStorage.setItem(`manual_grades_${selectedStudent.id}`, JSON.stringify(updated));
    setManualGrades(updated);
    
    // Reset form
    setSelectedSubject("");
    setGrade("");

    toast({
      title: "Grade Saved",
      description: "The grade has been successfully recorded.",
    });
  };

  const handleDelete = (subjectId: string) => {
    if (!selectedStudent) return;
    const updated = { ...manualGrades };
    delete updated[subjectId];
    localStorage.setItem(`manual_grades_${selectedStudent.id}`, JSON.stringify(updated));
    setManualGrades(updated);

    toast({
      title: "Grade Removed",
      description: "The grade has been removed.",
    });
  };

  if (!selectedStudent) return null;

  return (
    <Card className="border-none shadow-card mb-8">
      <CardHeader className="border-b space-y-1">
        <CardTitle className="flex items-center gap-2 text-xl">
          <GraduationCap className="w-5 h-5 text-primary" />
          Assign Final Grades
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Grading Scale: <span className="font-medium text-foreground">O (100)</span>, <span className="font-medium text-foreground">A+ (90)</span>, <span className="font-medium text-foreground">A (80)</span>, <span className="font-medium text-foreground">B+ (70)</span>, <span className="font-medium text-foreground">B (60)</span>, <span className="font-medium text-foreground">C (50)</span>, <span className="font-medium text-destructive">U (FAIL)</span>
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-2">
            <Label>Registered Subject</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.code} - {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-4 space-y-2">
            <Label>Grade (O to U)</Label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-3 flex items-end">
            <Button onClick={handleSave} className="w-full gap-2">
              <Save className="w-4 h-4" />
              Save Grade
            </Button>
          </div>
        </div>

        {Object.keys(manualGrades).length > 0 && (
          <div className="mt-8 rounded-xl border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Object.entries(manualGrades).map(([subjectId, g]) => {
                  const subjectInfo = subjects.find(s => s.id === subjectId);
                  return (
                    <tr key={subjectId} className="bg-card hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{subjectInfo?.name || 'Unknown Subject'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{subjectInfo?.code || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary">
                          {g}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(subjectId)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
  );
};
