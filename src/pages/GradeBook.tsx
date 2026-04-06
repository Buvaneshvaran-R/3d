import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GraduationCap, Award, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const calculateGrade = (percentage: number): string => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  return "F";
};

const getGradePoint = (grade: string): number => {
  const gradePoints: Record<string, number> = {
    "A+": 10, "A": 9, "B+": 8, "B": 7, "C": 6, "F": 0
  };
  return gradePoints[grade] || 0;
};

const getGradeColor = (grade: string) => {
  if (grade === "A+") return "text-success";
  if (grade === "A") return "text-primary";
  if (grade === "B+") return "text-warning";
  return "text-muted-foreground";
};

const GradeBook = () => {
  const { user, selectedStudent, isAdmin } = useAuth();
  const [subjectGrades, setSubjectGrades] = useState<Array<{ subjectName: string; subjectCode: string; grade: string; points: number; credits: number }>>([]);;

  useEffect(() => {
    loadGrades();
    const interval = setInterval(loadGrades, 3000);
    return () => clearInterval(interval);
  }, [user, selectedStudent]);

  const loadGrades = async () => {
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

      if (!studentId) return;

      // Load all marks
      const catMarks = JSON.parse(localStorage.getItem(`cat_marks_${studentId}`) || '[]');
      const labMarks = JSON.parse(localStorage.getItem(`lab_marks_${studentId}`) || '[]');
      const assignmentMarks = JSON.parse(localStorage.getItem(`assignment_marks_${studentId}`) || '[]');

      // Group by subject
      const subjectMap: Record<string, { cat: Array<{ score: number; maxMarks: number }>; lab: Array<{ score: number; maxMarks: number }>; assignment: Array<{ score: number; maxMarks: number }>; subjectName: string; subjectCode: string }> = {};;

      [...catMarks, ...labMarks, ...assignmentMarks].forEach(mark => {
        const key = mark.subjectId;
        if (!subjectMap[key]) {
          subjectMap[key] = {
            subjectId: mark.subjectId,
            subjectName: mark.subjectName,
            subjectCode: mark.subjectCode,
            cat: [],
            lab: [],
            assignment: []
          };
        }
        
        if (catMarks.some(m => m.id === mark.id)) {
          subjectMap[key].cat.push(mark);
        } else if (labMarks.some(m => m.id === mark.id)) {
          subjectMap[key].lab.push(mark);
        } else {
          subjectMap[key].assignment.push(mark);
        }
      });

      // Calculate grades for each subject
      const grades = Object.values(subjectMap).map((subject: { cat: Array<{ score: number; maxMarks: number }>; lab: Array<{ score: number; maxMarks: number }>; assignment: Array<{ score: number; maxMarks: number }>; subjectName: string; subjectCode: string }) => {
        const catAvg = subject.cat.length > 0
          ? subject.cat.reduce((acc: number, m: { score: number; maxMarks: number }) => acc + (m.score / m.maxMarks) * 100, 0) / subject.cat.length
          : 0;
        const labAvg = subject.lab.length > 0
          ? subject.lab.reduce((acc: number, m: { score: number; maxMarks: number }) => acc + (m.score / m.maxMarks) * 100, 0) / subject.lab.length
          : 0;
        const assignmentAvg = subject.assignment.length > 0
          ? subject.assignment.reduce((acc: number, m: { score: number; maxMarks: number }) => acc + (m.score / m.maxMarks) * 100, 0) / subject.assignment.length
          : 0;

        // Weighted calculation: CAT 40%, Lab 30%, Assignment 30%
        const total = (catAvg * 0.4) + (labAvg * 0.3) + (assignmentAvg * 0.3);
        const grade = calculateGrade(total);
        const gradePoint = getGradePoint(grade);

        return {
          ...subject,
          catAvg: Math.round(catAvg),
          labAvg: Math.round(labAvg),
          assignmentAvg: Math.round(assignmentAvg),
          total: Math.round(total),
          grade,
          gradePoint
        };
      });

      setSubjectGrades(grades);
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const gpa = subjectGrades.length > 0
    ? (subjectGrades.reduce((acc, s) => acc + s.gradePoint, 0) / subjectGrades.length).toFixed(2)
    : "0.00";

  const bestSubject = subjectGrades.length > 0
    ? subjectGrades.reduce((max, s) => s.total > max.total ? s : max, subjectGrades[0])
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Grade Book</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">GPA</p>
                <p className="text-4xl font-bold text-foreground mt-2">{gpa}</p>
                <p className="text-xs text-muted-foreground mt-1">Grade Point Average</p>
              </div>
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Performance</p>
                <p className="text-4xl font-bold text-success mt-2">{bestSubject?.total || '—'}<span className="text-lg text-muted-foreground">%</span></p>
                <p className="text-xs text-muted-foreground mt-1">{bestSubject?.subjectName || '—'}</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
                <Award className="w-8 h-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
                <p className="text-4xl font-bold text-primary mt-2">{subjectGrades.length}</p>
                <p className="text-xs text-muted-foreground mt-1">With recorded marks</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Information */}
      <Card className="border-none shadow-card bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <span className="text-muted-foreground">CAT: <span className="font-medium text-foreground">40%</span></span>
            <span className="text-muted-foreground">Lab: <span className="font-medium text-foreground">30%</span></span>
            <span className="text-muted-foreground">Assignment: <span className="font-medium text-foreground">30%</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Subject-wise Grades */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Subject-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th className="text-center">CAT (40%)</th>
                  <th className="text-center">Lab (30%)</th>
                  <th className="text-center">Assignment (30%)</th>
                  <th className="text-center">Total</th>
                  <th className="text-center">Grade</th>
                  <th className="text-center">Grade Point</th>
                </tr>
              </thead>
              <tbody>
                {subjectGrades.map((subject, index) => (
                  <tr key={index}>
                    <td className="font-medium">{subject.subjectName}</td>
                    <td className="text-muted-foreground">{subject.subjectCode}</td>
                    <td className="text-center">
                      <span className="font-semibold text-foreground">{subject.catAvg}%</span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold text-foreground">{subject.labAvg}%</span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold text-foreground">{subject.assignmentAvg}%</span>
                    </td>
                    <td className="text-center">
                      <span className="text-lg font-bold text-primary">{subject.total}%</span>
                    </td>
                    <td className="text-center">
                      <span className={`text-2xl font-bold ${getGradeColor(subject.grade)}`}>
                        {subject.grade}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold text-foreground">{subject.gradePoint}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {subjectGrades.length === 0 && (
            <div className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">No grades available yet. Marks will appear here once CAT, Lab, and Assignment scores are recorded.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Scale Reference */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle>Grade Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-success/10">
              <div className="text-2xl font-bold text-success">A+</div>
              <div className="text-sm text-muted-foreground">90-100%</div>
              <div className="text-xs text-muted-foreground">GP: 10</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <div className="text-2xl font-bold text-primary">A</div>
              <div className="text-sm text-muted-foreground">80-89%</div>
              <div className="text-xs text-muted-foreground">GP: 9</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <div className="text-2xl font-bold text-warning">B+</div>
              <div className="text-sm text-muted-foreground">70-79%</div>
              <div className="text-xs text-muted-foreground">GP: 8</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <div className="text-2xl font-bold text-warning">B</div>
              <div className="text-sm text-muted-foreground">60-69%</div>
              <div className="text-xs text-muted-foreground">GP: 7</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold text-muted-foreground">C</div>
              <div className="text-sm text-muted-foreground">50-59%</div>
              <div className="text-xs text-muted-foreground">GP: 6</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive">F</div>
              <div className="text-sm text-muted-foreground">&lt;50%</div>
              <div className="text-xs text-muted-foreground">GP: 0</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeBook;
