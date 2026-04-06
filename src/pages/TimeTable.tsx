import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminTimeTableEditor } from "@/components/admin/AdminTimeTableEditor";
import { supabase } from "@/lib/supabase";

const timeSlots = ["9:00 - 9:50", "9:50 - 10:40", "10:50 - 11:40", "11:40 - 12:30", "1:30 - 2:20", "2:20 - 3:10", "3:20 - 4:10"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const subjectColors: Record<string, string> = {
  "CS101": "bg-blue-50 border-blue-200",
  "CS102": "bg-green-50 border-green-200",
  "CS103": "bg-purple-50 border-purple-200",
  "CS104": "bg-orange-50 border-orange-200",
  "CS105": "bg-pink-50 border-pink-200",
};

const TimeTable = () => {
  const { isAdmin, user, selectedStudent } = useAuth();
  const [timetable, setTimetable] = useState<Record<string, Array<{ subject: string; room: string; time: string }>>>({});;

  useEffect(() => {
    loadTimetable();
    const interval = setInterval(loadTimetable, 3000);
    return () => clearInterval(interval);
  }, [user, selectedStudent]);

  const loadTimetable = async () => {
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
        const saved = localStorage.getItem(`timetable_${studentId}`);
        if (saved) {
          setTimetable(JSON.parse(saved));
        } else {
          setTimetable({});
        }
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Time Table</h1>

      {/* Admin Editor */}
      {isAdmin() && <AdminTimeTableEditor />}

      {/* Weekly Timetable */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Weekly Schedule - Semester VI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[80px]">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Time
                  </th>
                  {days.map((day) => (
                    <th key={day} className="border border-border px-2 py-2 text-center text-xs font-semibold min-w-[100px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot} className="hover:bg-muted/30 transition-colors">
                    <td className="border border-border px-3 py-2 bg-muted/20">
                      <span className="text-xs font-medium text-muted-foreground">{slot}</span>
                    </td>
                    {days.map((day) => {
                      const cls = timetable[day]?.[slot];
                      if (!cls) {
                        return (
                          <td key={day} className="border border-border px-2 py-3 text-center">
                            <span className="text-muted-foreground/50">-</span>
                          </td>
                        );
                      }
                      const colorClass = cls.type === "lab" 
                        ? "bg-accent/10 border-accent/20" 
                        : subjectColors[cls.code] || "bg-muted border-border";
                      
                      return (
                        <td key={day} className="border border-border px-2 py-2">
                          <div className={`p-2 rounded-lg border ${colorClass} text-center transition-all hover:scale-105 cursor-pointer`}>
                            <p className="font-medium text-xs text-foreground">{cls.subject}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{cls.room}</p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-none shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
              <span className="text-muted-foreground">Theory Class</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent/10 border border-accent/20" />
              <span className="text-muted-foreground">Lab Session</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-primary" />
              <span className="text-muted-foreground">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTable;
