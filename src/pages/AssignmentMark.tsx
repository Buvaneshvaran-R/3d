import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Award, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { AdminMarksEditor } from "@/components/admin/AdminMarksEditor";
import { supabase } from "@/lib/supabase";

const AssignmentMark = () => {
  const { isAdmin, user, selectedStudent } = useAuth();
  const [marks, setMarks] = useState<Array<{ subjectId: string; subjectName: string; subjectCode: string; score: number; maxMarks: number; remarks: string; date: string }>>([]);;

  useEffect(() => {
    loadMarks();
    const interval = setInterval(loadMarks, 3000);
    return () => clearInterval(interval);
  }, [user, selectedStudent]);

  const loadMarks = async () => {
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
        const saved = localStorage.getItem(`assignment_marks_${studentId}`);
        if (saved) {
          setMarks(JSON.parse(saved));
        } else {
          setMarks([]);
        }
      }
    } catch (error) {
      console.error('Error loading Assignment marks:', error);
    }
  };

  const groupedMarks = marks.reduce((acc, mark) => {
    const key = mark.subjectId;
    if (!acc[key]) {
      acc[key] = {
        subjectName: mark.subjectName,
        subjectCode: mark.subjectCode,
        marks: []
      };
    }
    acc[key].marks.push(mark);
    return acc;
  }, {} as Record<string, { subjectName: string; subjectCode: string; marks: Array<{ score: number; maxMarks: number; remarks: string; date: string }> }>);;

  const calculateAverage = (marks: Array<{ score: number; maxMarks: number }>) => {
    if (marks.length === 0) return 0;
    const sum = marks.reduce((acc, m) => acc + (m.score / m.maxMarks) * 100, 0);
    return Math.round(sum / marks.length);
  };

  const overallAverage = marks.length > 0
    ? Math.round(marks.reduce((acc, m) => acc + (m.score / m.maxMarks) * 100, 0) / marks.length)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Assignment Mark</h1>

      {/* Admin Editor */}
      {isAdmin() && <AdminMarksEditor type="assignment" title="Manage Assignment Marks" maxMarks={10} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Average</p>
                <p className="text-3xl font-bold text-foreground mt-2">{overallAverage}<span className="text-lg text-muted-foreground">%</span></p>
                <Progress value={overallAverage} className="h-2 mt-3" />
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Award className="w-7 h-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
                <p className="text-3xl font-bold text-foreground mt-2">{marks.length}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subjects</p>
                <p className="text-3xl font-bold text-foreground mt-2">{Object.keys(groupedMarks).length}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment Marks by Subject */}
      {Object.values(groupedMarks).map((subject: { subjectName: string; subjectCode: string; marks: Array<{ score: number; maxMarks: number }> }, idx: number) => (
        <Card key={idx} className="border-none shadow-card overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {subject.subjectName} ({subject.subjectCode})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Percentage</th>
                    <th>Remarks</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {subject.marks.map((mark: { subjectName: string; subjectCode: string; score: number; maxMarks: number; remarks: string; date: string }, index: number) => {
                    const percentage = Math.round((mark.score / mark.maxMarks) * 100);
                    return (
                      <tr key={index}>
                        <td className="font-medium">Assignment {mark.testNumber}</td>
                        <td className="text-center">
                          <span className={`font-bold ${
                            percentage >= 90 ? "text-success" :
                            percentage >= 75 ? "text-primary" :
                            percentage >= 60 ? "text-warning" :
                            "text-destructive"
                          }`}>
                            {mark.score}/{mark.maxMarks}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold">{percentage}%</span>
                            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  percentage >= 90 ? "bg-success" :
                                  percentage >= 75 ? "bg-primary" :
                                  percentage >= 60 ? "bg-warning" :
                                  "bg-destructive"
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{mark.remarks || '-'}</td>
                        <td className="text-muted-foreground">{new Date(mark.addedAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {subject.marks.length > 0 && (
              <div className="p-4 bg-muted/50 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Subject Average</span>
                  <span className="text-xl font-bold text-primary">{calculateAverage(subject.marks)}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {marks.length === 0 && (
        <Card className="border-none shadow-card">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground">No assignment marks available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssignmentMark;
