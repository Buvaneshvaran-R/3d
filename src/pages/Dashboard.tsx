import { 
  ClipboardList, 
  FileCheck, 
  Clock, 
  Calendar,
  TrendingUp,
  BookOpen,
  Award,
  Users,
  UserCheck,
  BookText,
  MessageSquare,
  CalendarDays,
  UserX,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AcademicCalendar from "@/components/AcademicCalendar";

const statCards: Array<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className: string }>;
  color: string;
  trend: string;
}> = [];

interface Achievement {
  id: string;
  event_name: string;
  achievement_type: string;
}

const Dashboard = () => {
  const { role, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<{
    name: string;
    registerNo: string;
    department: string;
    semester: string;
    currentSemester: number;
  }>({ name: "", registerNo: "", department: "", semester: "", currentSemester: 3 });
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [semesterRecords, setSemesterRecords] = useState<Map<number, {
    credits: number;
    backlogs: number;
    cgpa: number;
    published: boolean;
  }>>(new Map());
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentGrades, setRecentGrades] = useState<Array<{
    subject: string;
    grade: string;
    marks: number;
  }>>([]);

  // Load student data
  useEffect(() => {
    let intervalId: any;

    const loadStudentData = async () => {
      if (!isAdmin() && user?.id) {
        try {
          const { data, error } = await supabase
            .from('students')
            .select('id, name, register_no, department, semester')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            const currentSem = data.semester || 3;
            setStudentData({
              name: data.name || "",
              registerNo: data.register_no || "",
              department: data.department || "",
              semester: data.semester ? `Semester ${data.semester}` : "Semester 3",
              currentSemester: currentSem,
            });
            
            // Load semester records
            loadSemesterRecords(data.id);
            loadAchievements(data.id);
            loadRecentGrades(data.id);

            // Poll for grades updates from localStorage every 3 seconds
            clearInterval(intervalId);
            intervalId = setInterval(() => loadRecentGrades(data.id), 3000);
          }
        } catch (error) {
          console.error('Error loading student data:', error);
        }
      }
    };

    const loadSemesterRecords = async (studentId: string) => {
      try {
        const { data, error } = await supabase
          .from('semester_records')
          .select('semester, credits_earned, backlogs, cgpa, result_published')
          .eq('student_id', studentId)
          .eq('result_published', true);

        if (error) throw error;

        const recordsMap = new Map();
        data?.forEach(record => {
          recordsMap.set(record.semester, {
            credits: record.credits_earned || 0,
            backlogs: record.backlogs || 0,
            cgpa: record.cgpa || 0,
            published: record.result_published || false,
          });
        });
        
        setSemesterRecords(recordsMap);
      } catch (error) {
        console.error('Error loading semester records:', error);
      }
    };

    const loadAchievements = async (studentId: string) => {
      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('id, event_name, achievement_type')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setAchievements(data || []);
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    };

    const calculateGrade = (percentage: number): string => {
      if (percentage >= 100) return "O";
      if (percentage >= 90) return "A+";
      if (percentage >= 80) return "A";
      if (percentage >= 70) return "B+";
      if (percentage >= 60) return "B";
      if (percentage >= 50) return "C";
      return "U";
    };

    const getGradePercentage = (grade: string): number => {
      switch(grade) {
        case "O": return 100;
        case "A+": return 90;
        case "A": return 80;
        case "B+": return 70;
        case "B": return 60;
        case "C": return 50;
        case "U": return 0;
        default: return 0;
      }
    };

    const loadRecentGrades = async (studentId: string) => {
      try {
        const manualGrades = JSON.parse(localStorage.getItem(`manual_grades_${studentId}`) || '{}');
        const catMarks = JSON.parse(localStorage.getItem(`cat_marks_${studentId}`) || '[]');
        const labMarks = JSON.parse(localStorage.getItem(`lab_marks_${studentId}`) || '[]');
        const assignmentMarks = JSON.parse(localStorage.getItem(`assignment_marks_${studentId}`) || '[]');
        
        let registeredSubjects: any[] = [];
        try {
          const { data } = await supabase
            .from('student_subjects')
            .select(`
              subject_id,
              subjects (
                id,
                code,
                name
              )
            `)
            .eq('student_id', studentId);
            
          if (data) {
            registeredSubjects = data.map((item: any) => ({
              subjectId: item.subject_id,
              subjectName: item.subjects?.name,
              subjectCode: item.subjects?.code
            }));
          }
        } catch (e) {
          console.error("Failed to load registered subjects from DB:", e);
        }

        const subjectMap: Record<string, any> = {};

        // Load registered subjects first so they populate the map
        registeredSubjects.forEach((sub: any) => {
          const key = sub.subjectId;
          if (key) {
            subjectMap[key] = {
              subjectId: key,
              subjectName: sub.subjectName || sub.name,
              cat: [],
              lab: [],
              assignment: []
            };
          }
        });

        [...catMarks, ...labMarks, ...assignmentMarks].forEach(mark => {
          const key = mark.subjectId;
          if (!subjectMap[key]) {
            subjectMap[key] = {
              subjectId: mark.subjectId,
              subjectName: mark.subjectName,
              cat: [],
              lab: [],
              assignment: []
            };
          }
          if (catMarks.some((m: any) => m.id === mark.id && m.subjectId === mark.subjectId)) {
            subjectMap[key].cat.push(mark);
          } else if (labMarks.some((m: any) => m.id === mark.id && m.subjectId === mark.subjectId)) {
            subjectMap[key].lab.push(mark);
          } else if (assignmentMarks.some((m: any) => m.id === mark.id && m.subjectId === mark.subjectId)) {
            subjectMap[key].assignment.push(mark);
          }
        });

        const grades = Object.values(subjectMap).map((subject: any) => {
          const catAvg = subject.cat.length > 0 ? subject.cat.reduce((acc: number, m: any) => acc + (m.score / m.maxMarks) * 100, 0) / subject.cat.length : 0;
          const labAvg = subject.lab.length > 0 ? subject.lab.reduce((acc: number, m: any) => acc + (m.score / m.maxMarks) * 100, 0) / subject.lab.length : 0;
          const assignmentAvg = subject.assignment.length > 0 ? subject.assignment.reduce((acc: number, m: any) => acc + (m.score / m.maxMarks) * 100, 0) / subject.assignment.length : 0;

          const total = (catAvg * 0.4) + (labAvg * 0.3) + (assignmentAvg * 0.3);
          
          const manualGrade = manualGrades[subject.subjectId];

          return {
            subject: subject.subjectName,
            grade: manualGrade || calculateGrade(total),
            marks: manualGrade ? getGradePercentage(manualGrade) : Math.round(total),
            isManual: !!manualGrade
          };
        });

        // Filter out subjects with 0 marks if they haven't started grading
        const recent = grades.filter((g: any) => g.marks > 0 || g.isManual).slice(0, 3);
        setRecentGrades(recent);
      } catch (error) {
        console.error('Error loading grades:', error);
      }
    };

    loadStudentData();

    // Set up real-time subscription
    if (!isAdmin() && user?.id) {
      const channel = supabase
        .channel('dashboard-student-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'students',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadStudentData();
          }
        )
        .subscribe();

      return () => {
        clearInterval(intervalId);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAdmin, user?.id]);

  // Admin Dashboard
  if (isAdmin()) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Admin Dashboard 👨‍💼
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage students, attendance, marks, and more
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Academic Year 2024-25</span>
          </div>
        </div>

        {/* Admin Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none hover:scale-[1.02] transition-transform cursor-pointer bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    0
                  </p>
                  <p className="text-xs text-blue-100 mt-1">
                    Registered students
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none hover:scale-[1.02] transition-transform cursor-pointer bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-green-100">
                    Attendance Today
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    0%
                  </p>
                  <p className="text-xs text-green-100 mt-1">
                    Average attendance
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none hover:scale-[1.02] transition-transform cursor-pointer bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-100">
                    Active Subjects
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    0
                  </p>
                  <p className="text-xs text-purple-100 mt-1">
                    Current semester
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <BookText className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none hover:scale-[1.02] transition-transform cursor-pointer bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-100">
                    Pending Requests
                  </p>
                  <p className="text-3xl font-bold mt-2">
                    0
                  </p>
                  <p className="text-xs text-orange-100 mt-1">
                    Leave & certificates
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-xl">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => navigate('/attendance')}
                className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all text-left cursor-pointer"
              >
                <UserCheck className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">Mark Attendance</h3>
                <p className="text-sm text-muted-foreground">Record student attendance</p>
              </button>
              
              <button 
                onClick={() => navigate('/cat-mark')}
                className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all text-left cursor-pointer"
              >
                <BookText className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">Enter Marks</h3>
                <p className="text-sm text-muted-foreground">Update CAT/Lab marks</p>
              </button>
              
              <button 
                onClick={() => navigate('/admin/students')}
                className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all text-left cursor-pointer"
              >
                <Users className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold">View Students</h3>
                <p className="text-sm text-muted-foreground">Manage student records</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Academic Calendar */}
        <AcademicCalendar />

        {/* Recent Activity */}
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student Dashboard (original code)
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome, {studentData.name || user?.name || "Student"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            <span className="font-medium">Reg. No:</span> {studentData.registerNo || "Not available"} | 
            <span className="font-medium ml-2">Dept:</span> {studentData.department || "Not available"}
          </p>
        </div>
        <Popover open={semesterOpen} onOpenChange={setSemesterOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-accent">
              <Calendar className="w-4 h-4" />
              <span>{studentData.semester || "Semester 3"} | Academic Year 2024-25</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Semester History</h4>
              <div className="space-y-2">
                {/* Generate boxes for past semesters only (current semester - 1) */}
                {Array.from({ length: studentData.currentSemester - 1 }, (_, i) => i + 1).map((semNum) => (
                  <button
                    key={semNum}
                    onClick={() => {
                      setSelectedSemester(selectedSemester === semNum ? null : semNum);
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {semNum}
                        </div>
                        <div>
                          <p className="font-medium text-sm">Semester {semNum}</p>
                          <p className="text-xs text-muted-foreground">Academic Year 2024-25</p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${selectedSemester === semNum ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {selectedSemester === semNum && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        {semesterRecords.has(semNum) ? (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-primary/5 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Credits Earned</p>
                                <p className="text-lg font-bold text-primary">{semesterRecords.get(semNum)!.credits}</p>
                              </div>
                              <div className="bg-destructive/5 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Backlogs</p>
                                <p className="text-lg font-bold text-destructive">{semesterRecords.get(semNum)!.backlogs}</p>
                              </div>
                            </div>
                            <div className="bg-success/5 p-2 rounded">
                              <p className="text-xs text-muted-foreground">CGPA</p>
                              <p className="text-lg font-bold text-success">{semesterRecords.get(semNum)!.cgpa.toFixed(2)}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-primary/5 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Credits Earned</p>
                                <p className="text-lg font-bold text-muted-foreground">-</p>
                              </div>
                              <div className="bg-destructive/5 p-2 rounded">
                                <p className="text-xs text-muted-foreground">Backlogs</p>
                                <p className="text-lg font-bold text-muted-foreground">-</p>
                              </div>
                            </div>
                            <div className="bg-success/5 p-2 rounded">
                              <p className="text-xs text-muted-foreground">CGPA</p>
                              <p className="text-lg font-bold text-muted-foreground">-</p>
                            </div>
                            <p className="text-xs text-center text-muted-foreground italic mt-2">
                              Results will be available after semester completion
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </button>
                ))}
                {studentData.currentSemester <= 1 && (
                  <p className="text-sm text-center text-muted-foreground py-4">
                    No previous semester records
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            className="stat-card border-none hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.subtitle}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3 text-success" />
                <span className="text-success">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievements */}
        <Card className="border-none shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-primary" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievements.length > 0 ? achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {achievement.achievement_type === 'Participated' || achievement.achievement_type === 'Participant'
                      ? `Participated in ${achievement.event_name}`
                      : `${achievement.achievement_type} in ${achievement.event_name}`}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground p-4 text-center bg-muted/50 rounded-xl">
                No recent achievements
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card className="border-none shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-primary" />
              Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentGrades.length > 0 ? recentGrades.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground truncate">
                      {item.subject}
                    </p>
                    <span className="text-sm font-bold text-primary">
                      {item.grade}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={item.marks} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10">
                      {item.marks}%
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground p-4 text-center bg-muted/50 rounded-xl">
                No recent grades available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Academic Calendar & Leave Tracking */}
      <AcademicCalendar />

      {/* Quick Actions */}
      <Card className="border-none shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ClipboardList, label: "View Attendance", color: "bg-primary", path: "/attendance" },
              { icon: FileCheck, label: "Check Marks", color: "bg-success", path: "/gradebook" },
              { icon: Calendar, label: "Time Table", color: "bg-warning", path: "/timetable" },
              { icon: Award, label: "Certificates", color: "bg-accent", path: "/certificates" },
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-3 p-6 rounded-xl bg-muted/50 hover:bg-muted transition-all hover:scale-105 cursor-pointer"
              >
                <div className={`${action.color} p-3 rounded-xl`}>
                  <action.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
