import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface AdminMarksEditorProps {
  type: 'cat' | 'lab' | 'assignment';
  title: string;
  maxMarks: number;
}

type RecordedMark = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  testNumber: string;
  score: number;
  maxMarks: number;
  remarks: string;
  date: string;
};

export const AdminMarksEditor = ({ type, title, maxMarks }: AdminMarksEditorProps) => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [marks, setMarks] = useState<RecordedMark[]>([])
  const [selectedSubject, setSelectedSubject] = useState("");
  const [testNumber, setTestNumber] = useState("1");
  const [score, setScore] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (selectedStudent) {
      fetchSubjects();
      loadMarks();
    }
  }, [selectedStudent]);

  const fetchSubjects = async () => {
    try {
      if (!selectedStudent) return;
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
      const enrolledSubjects = data?.map(item => item.subjects).filter(Boolean) || [];
      setSubjects(enrolledSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const loadMarks = () => {
    try {
      if (!selectedStudent) return;
      const saved = localStorage.getItem(`${type}_marks_${selectedStudent.id}`);
      if (saved) {
        setMarks(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading marks:', error);
    }
  };

  const handleSave = () => {
    if (!selectedStudent || !selectedSubject || !score) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxMarks) {
      toast({
        title: "Invalid Score",
        description: `Score must be between 0 and ${maxMarks}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const subject = subjects.find(s => s.id === selectedSubject);
      const newMark: RecordedMark = {
        id: Date.now().toString(),
        subjectId: selectedSubject,
        subjectName: subject.name,
        subjectCode: subject.code,
        testNumber,
        score: scoreNum,
        maxMarks,
        remarks,
        date: new Date().toISOString()
      };

      const updated = [...marks, newMark];
      localStorage.setItem(`${type}_marks_${selectedStudent.id}`, JSON.stringify(updated));
      setMarks(updated);

      toast({
        title: "Success",
        description: "Marks added successfully"
      });

      setSelectedSubject("");
      setTestNumber("1");
      setScore("");
      setRemarks("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add marks",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (id: string) => {
    try {
      const updated = marks.filter(m => m.id !== id);
      localStorage.setItem(`${type}_marks_${selectedStudent.id}`, JSON.stringify(updated));
      setMarks(updated);

      toast({
        title: "Success",
        description: "Marks deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete marks",
        variant: "destructive",
      });
    }
  };

  const getTestLabel = () => {
    if (type === 'cat') return 'CAT Number';
    if (type === 'lab') return 'Lab Number';
    return 'Assignment Number';
  };

  return (
    <Card className="border-none shadow-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedStudent ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Please select a student to manage marks</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{getTestLabel()}</Label>
                <Select value={testNumber} onValueChange={setTestNumber}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Score (out of {maxMarks})</Label>
                <Input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  max={maxMarks}
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Remarks (Optional)</Label>
                <Input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Excellent"
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full md:w-auto gap-2">
              <Save className="w-4 h-4" />
              Add Marks
            </Button>

            {/* Current Marks */}
            {marks.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Recorded Marks</h4>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>{getTestLabel()}</th>
                        <th>Score</th>
                        <th>Remarks</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks.map(mark => (
                        <tr key={mark.id}>
                          <td>{mark.subjectCode}</td>
                          <td>{type.toUpperCase()} {mark.testNumber}</td>
                          <td className="font-semibold">
                            {mark.score}/{mark.maxMarks}
                          </td>
                          <td>{mark.remarks || '-'}</td>
                          <td>{new Date(mark.date).toLocaleDateString()}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(mark.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
