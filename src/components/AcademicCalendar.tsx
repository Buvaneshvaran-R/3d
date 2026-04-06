import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, UserX, CheckCircle2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CalendarDay {
  date: number;
  type: 'working' | 'holiday' | 'weekend' | 'reopening' | 'ccm' | 'gc' | 'cat' | 'club' | 'feedback' | 'lwd' | 'practical' | 'theory';
  event?: string;
  cumDays?: number;
  assignment?: string;
  unit?: string;
  adminNote?: string;
}

interface MonthData {
  name: string;
  year: number;
  days: CalendarDay[];
  startDay: number;
}

// ORIGINAL CALENDAR DATA - NEVER CHANGES
const BASE_CALENDAR_DATA: MonthData[] = [
  {
    name: "JANUARY",
    year: 2026,
    startDay: 4,
    days: [
      { date: 1, type: 'holiday', cumDays: 0 },
      { date: 2, type: 'holiday', cumDays: 0 },
      { date: 3, type: 'holiday', cumDays: 0 },
      { date: 4, type: 'holiday', cumDays: 0 },
      { date: 5, type: 'reopening', event: 'Reopening', cumDays: 6 },
      { date: 6, type: 'working', cumDays: 6 },
      { date: 7, type: 'working', cumDays: 6 },
      { date: 8, type: 'working', cumDays: 6 },
      { date: 9, type: 'working', cumDays: 6 },
      { date: 10, type: 'working', cumDays: 6 },
      { date: 11, type: 'holiday', cumDays: 6 },
      { date: 12, type: 'ccm', event: 'CoCM', cumDays: 0 },
      { date: 13, type: 'holiday', cumDays: 0 },
      { date: 14, type: 'holiday', cumDays: 0 },
      { date: 15, type: 'holiday', cumDays: 5 },
      { date: 16, type: 'holiday', cumDays: 5 },
      { date: 17, type: 'holiday', cumDays: 5 },
      { date: 18, type: 'holiday', cumDays: 5 },
      { date: 19, type: 'working', cumDays: 11, assignment: 'Assignment 1' },
      { date: 20, type: 'working', cumDays: 11 },
      { date: 21, type: 'working', cumDays: 11 },
      { date: 22, type: 'working', cumDays: 11 },
      { date: 23, type: 'working', cumDays: 11 },
      { date: 24, type: 'holiday', cumDays: 11 },
      { date: 25, type: 'holiday', cumDays: 11 },
      { date: 26, type: 'holiday', cumDays: 14, unit: 'Unit I (14)' },
      { date: 27, type: 'holiday', cumDays: 14 },
      { date: 28, type: 'working', cumDays: 14 },
      { date: 29, type: 'working', cumDays: 14 },
      { date: 30, type: 'working', cumDays: 14 },
      { date: 31, type: 'club', event: 'Club Day', cumDays: 14 },
    ]
  },
  {
    name: "FEBRUARY",
    year: 2026,
    startDay: 0,
    days: [
      { date: 1, type: 'holiday', cumDays: 14 },
      { date: 2, type: 'ccm', event: 'CCM 1', cumDays: 19, assignment: 'Assignment 2' },
      { date: 3, type: 'working', cumDays: 19 },
      { date: 4, type: 'working', cumDays: 19 },
      { date: 5, type: 'working', cumDays: 19 },
      { date: 6, type: 'working', cumDays: 19 },
      { date: 7, type: 'holiday', cumDays: 19 },
      { date: 8, type: 'holiday', cumDays: 19 },
      { date: 9, type: 'ccm', event: 'CCM 1', cumDays: 19 },
      { date: 10, type: 'gc', event: 'GC', cumDays: 22, unit: 'Unit Test 1' },
      { date: 11, type: 'working', cumDays: 22 },
      { date: 12, type: 'working', cumDays: 22 },
      { date: 13, type: 'working', cumDays: 22 },
      { date: 14, type: 'club', event: 'Club Day', cumDays: 22 },
      { date: 15, type: 'holiday', cumDays: 22 },
      { date: 16, type: 'working', cumDays: 27 },
      { date: 17, type: 'working', cumDays: 27 },
      { date: 18, type: 'working', cumDays: 27 },
      { date: 19, type: 'working', cumDays: 27 },
      { date: 20, type: 'working', cumDays: 27 },
      { date: 21, type: 'holiday', cumDays: 27 },
      { date: 22, type: 'holiday', cumDays: 27 },
      { date: 23, type: 'holiday', cumDays: 32, unit: 'Unit II (14)' },
      { date: 24, type: 'cat', event: 'CAT I', cumDays: 32 },
      { date: 25, type: 'working', cumDays: 32 },
      { date: 26, type: 'working', cumDays: 32 },
      { date: 27, type: 'working', cumDays: 32 },
      { date: 28, type: 'holiday', cumDays: 32 },
    ]
  },
  {
    name: "MARCH",
    year: 2026,
    startDay: 0,
    days: [
      { date: 1, type: 'holiday', cumDays: 32 },
      { date: 2, type: 'feedback', event: 'Feedback', cumDays: 37, assignment: 'Assignment 3' },
      { date: 3, type: 'working', cumDays: 37 },
      { date: 4, type: 'working', cumDays: 37 },
      { date: 5, type: 'working', cumDays: 37 },
      { date: 6, type: 'working', cumDays: 37 },
      { date: 7, type: 'holiday', cumDays: 37 },
      { date: 8, type: 'holiday', cumDays: 37 },
      { date: 9, type: 'ccm', event: 'CCM 2', cumDays: 42, unit: 'Unit III (14)' },
      { date: 10, type: 'working', cumDays: 42 },
      { date: 11, type: 'working', cumDays: 42 },
      { date: 12, type: 'working', cumDays: 42 },
      { date: 13, type: 'working', cumDays: 42 },
      { date: 14, type: 'holiday', cumDays: 42 },
      { date: 15, type: 'holiday', cumDays: 42 },
      { date: 16, type: 'working', cumDays: 46, assignment: 'Assignment 4' },
      { date: 17, type: 'working', cumDays: 46 },
      { date: 18, type: 'cat', event: 'CAT II', cumDays: 46 },
      { date: 19, type: 'working', cumDays: 46 },
      { date: 20, type: 'working', cumDays: 46 },
      { date: 21, type: 'holiday', cumDays: 46 },
      { date: 22, type: 'holiday', cumDays: 46 },
      { date: 23, type: 'working', cumDays: 50 },
      { date: 24, type: 'working', cumDays: 50 },
      { date: 25, type: 'working', cumDays: 50 },
      { date: 26, type: 'club', event: 'Club Day', cumDays: 50 },
      { date: 27, type: 'working', cumDays: 50 },
      { date: 28, type: 'holiday', cumDays: 50 },
      { date: 29, type: 'holiday', cumDays: 50 },
      { date: 30, type: 'working', cumDays: 51 },
      { date: 31, type: 'working', cumDays: 51 },
    ]
  },
  {
    name: "APRIL",
    year: 2026,
    startDay: 3,
    days: [
      { date: 1, type: 'holiday', cumDays: 51 },
      { date: 2, type: 'holiday', cumDays: 53 },
      { date: 3, type: 'holiday', cumDays: 53 },
      { date: 4, type: 'holiday', cumDays: 53 },
      { date: 5, type: 'holiday', cumDays: 53 },
      { date: 6, type: 'ccm', event: 'CCM 3', cumDays: 58, unit: 'Unit IV (13)' },
      { date: 7, type: 'working', cumDays: 58 },
      { date: 8, type: 'working', cumDays: 58 },
      { date: 9, type: 'working', cumDays: 58 },
      { date: 10, type: 'working', cumDays: 58 },
      { date: 11, type: 'holiday', cumDays: 58 },
      { date: 12, type: 'holiday', cumDays: 58 },
      { date: 13, type: 'feedback', event: 'Feedback', cumDays: 62, assignment: 'Assignment 5' },
      { date: 14, type: 'working', cumDays: 62 },
      { date: 15, type: 'working', cumDays: 62 },
      { date: 16, type: 'working', cumDays: 62 },
      { date: 17, type: 'working', cumDays: 62 },
      { date: 18, type: 'holiday', cumDays: 62 },
      { date: 19, type: 'holiday', cumDays: 62 },
      { date: 20, type: 'working', cumDays: 67, unit: 'Unit Test 2' },
      { date: 21, type: 'working', cumDays: 67 },
      { date: 22, type: 'working', cumDays: 67 },
      { date: 23, type: 'working', cumDays: 67 },
      { date: 24, type: 'working', cumDays: 67 },
      { date: 25, type: 'holiday', cumDays: 67 },
      { date: 26, type: 'holiday', cumDays: 67 },
      { date: 27, type: 'cat', event: 'CAT III', cumDays: 71, unit: 'Unit V (13)' },
      { date: 28, type: 'working', cumDays: 71 },
      { date: 29, type: 'working', cumDays: 71 },
      { date: 30, type: 'working', cumDays: 71 },
    ]
  },
  {
    name: "MAY",
    year: 2026,
    startDay: 5,
    days: [
      { date: 1, type: 'holiday', cumDays: 71 },
      { date: 2, type: 'holiday', cumDays: 71 },
      { date: 3, type: 'holiday', cumDays: 71 },
      { date: 4, type: 'lwd', event: 'LWD', cumDays: 75 },
      { date: 5, type: 'working', cumDays: 75 },
      { date: 6, type: 'working', cumDays: 75 },
      { date: 7, type: 'working', cumDays: 75 },
      { date: 8, type: 'holiday', cumDays: 75 },
      { date: 9, type: 'holiday', cumDays: 75 },
      { date: 10, type: 'holiday', cumDays: 75 },
      { date: 11, type: 'practical', event: 'Practical' },
      { date: 12, type: 'practical', event: 'Practical' },
      { date: 13, type: 'working', cumDays: 75 },
      { date: 14, type: 'working', cumDays: 75 },
      { date: 15, type: 'working', cumDays: 75 },
      { date: 16, type: 'holiday', cumDays: 75 },
      { date: 17, type: 'holiday', cumDays: 75 },
      { date: 18, type: 'working', cumDays: 75 },
      { date: 19, type: 'working', cumDays: 75 },
      { date: 20, type: 'theory', event: 'Theory' },
      { date: 21, type: 'working', cumDays: 75 },
      { date: 22, type: 'working', cumDays: 75 },
      { date: 23, type: 'theory', event: 'Theory' },
      { date: 24, type: 'holiday', cumDays: 75 },
      { date: 25, type: 'working', cumDays: 75 },
      { date: 26, type: 'working', cumDays: 75 },
      { date: 27, type: 'theory', event: 'Theory' },
      { date: 28, type: 'working', cumDays: 75 },
      { date: 29, type: 'working', cumDays: 75 },
      { date: 30, type: 'theory', event: 'Theory' },
      { date: 31, type: 'holiday', cumDays: 75 },
    ]
  }
];

const getDayColor = (type: CalendarDay['type']) => {
  const colors: Record<CalendarDay['type'], string> = {
    working: 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:shadow-md hover:border-slate-400 dark:hover:border-slate-500',
    holiday: 'bg-pink-200 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100 border-pink-300 dark:border-pink-700 hover:shadow-lg hover:bg-pink-300 dark:hover:bg-pink-800/50',
    weekend: 'bg-slate-600 dark:bg-slate-900 text-white border-slate-700 dark:border-slate-800 hover:shadow-md hover:bg-slate-700',
    reopening: 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border-emerald-400 dark:border-emerald-700 hover:shadow-lg hover:bg-emerald-300 dark:hover:bg-emerald-800/50',
    ccm: 'bg-sky-200 dark:bg-sky-900/40 text-sky-900 dark:text-sky-100 border-sky-400 dark:border-sky-700 hover:shadow-lg hover:bg-sky-300 dark:hover:bg-sky-800/50',
    gc: 'bg-teal-200 dark:bg-teal-900/40 text-teal-900 dark:text-teal-100 border-teal-400 dark:border-teal-700 hover:shadow-lg hover:bg-teal-300 dark:hover:bg-teal-800/50',
    cat: 'bg-rose-300 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100 border-rose-400 dark:border-rose-700 hover:shadow-xl hover:bg-rose-400 dark:hover:bg-rose-800/60 font-bold',
    club: 'bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-400 dark:border-amber-700 hover:shadow-lg hover:bg-amber-300 dark:hover:bg-amber-800/50',
    feedback: 'bg-lime-200 dark:bg-lime-900/40 text-lime-900 dark:text-lime-100 border-lime-400 dark:border-lime-700 hover:shadow-lg hover:bg-lime-300 dark:hover:bg-lime-800/50',
    lwd: 'bg-indigo-200 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 border-indigo-400 dark:border-indigo-700 hover:shadow-lg hover:bg-indigo-300 dark:hover:bg-indigo-800/50',
    practical: 'bg-cyan-200 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100 border-cyan-400 dark:border-cyan-700 hover:shadow-lg hover:bg-cyan-300 dark:hover:bg-cyan-800/50',
    theory: 'bg-purple-200 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border-purple-400 dark:border-purple-700 hover:shadow-lg hover:bg-purple-300 dark:hover:bg-purple-800/50',
  };
  return colors[type];
};

const AcademicCalendar = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [calendarData, setCalendarData] = useState<MonthData[]>(BASE_CALENDAR_DATA);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<{ month: string; date: number; note: string } | null>(null);
  const [leaveUpdateTrigger, setLeaveUpdateTrigger] = useState(0);

  useEffect(() => {
    loadAdminNotes();
    
    // Refresh leave stats every 3 seconds
    const interval = setInterval(() => {
      setLeaveUpdateTrigger(prev => prev + 1);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadAdminNotes = () => {
    try {
      const saved = localStorage.getItem('calendar_admin_notes');
      if (saved) {
        const notes = JSON.parse(saved);
        setAdminNotes(notes);
        
        const updated = BASE_CALENDAR_DATA.map(month => ({
          ...month,
          days: month.days.map(day => {
            const key = `${month.name}-${day.date}`;
            return {
              ...day,
              adminNote: notes[key] || undefined
            };
          })
        }));
        setCalendarData(updated);
      }
    } catch (error) {
      console.error('Error loading admin notes:', error);
    }
  };

  const handleEditDay = (monthIndex: number, day: CalendarDay) => {
    if (!isAdmin()) return;
    const month = calendarData[monthIndex];
    const key = `${month.name}-${day.date}`;
    setEditingDay({
      month: month.name,
      date: day.date,
      note: adminNotes[key] || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!editingDay) return;

    try {
      const key = `${editingDay.month}-${editingDay.date}`;
      const updatedNotes = {
        ...adminNotes,
        [key]: editingDay.note
      };

      localStorage.setItem('calendar_admin_notes', JSON.stringify(updatedNotes));
      setAdminNotes(updatedNotes);

      const updated = BASE_CALENDAR_DATA.map(month => ({
        ...month,
        days: month.days.map(day => {
          const dayKey = `${month.name}-${day.date}`;
          return {
            ...day,
            adminNote: updatedNotes[dayKey] || undefined
          };
        })
      }));
      setCalendarData(updated);

      // Create notification for students
      if (editingDay.note.trim()) {
        createNotification(editingDay.month, editingDay.date, editingDay.note);
      }

      toast({
        title: "Success",
        description: "Admin note added and notification sent to students"
      });

      setEditDialogOpen(false);
      setEditingDay(null);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save admin note"
      });
    }
  };

  const createNotification = (month: string, date: number, note: string) => {
    try {
      const notifications = JSON.parse(localStorage.getItem('calendar_notifications') || '[]');
      
      const newNotification = {
        id: `calendar-${Date.now()}`,
        title: `📅 Calendar Update: ${month} ${date}`,
        message: note,
        time: new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        unread: true,
        timestamp: Date.now()
      };

      notifications.unshift(newNotification);
      
      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      
      localStorage.setItem('calendar_notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const calculateLeaveStats = () => {
    const totalWorkingDays = calendarData.reduce((total, month) => {
      return total + month.days.filter(day => day.type === 'working').length;
    }, 0);

    const totalMonths = calendarData.length;
    const totalAvailableLeaves = totalMonths * 3;
    
    // Calculate actual taken leaves from localStorage
    let takenLeaves = 0;
    try {
      const saved = localStorage.getItem('leave_applications');
      if (saved && user) {
        const allApplications = JSON.parse(saved);
        
        // Filter for current user's approved leaves (not OD)
        const myApprovedLeaves = allApplications.filter((app: { studentId: string; status: string; type: string; days: number }) => 
          app.studentId === user.id && 
          app.status === 'approved' && 
          app.type === 'Personal Leave'
        );
        
        // Sum up the days from all approved leaves
        takenLeaves = myApprovedLeaves.reduce((sum: number, app: { days: number }) => sum + (app.days || 0), 0);
      }
    } catch (error) {
      console.error('Error calculating leave stats:', error);
    }
    
    const availableLeaves = totalAvailableLeaves - takenLeaves;

    return {
      workingDays: totalWorkingDays,
      takenLeaves,
      availableLeaves,
      totalAvailableLeaves,
      totalMonths
    };
  };

  const leaveStats = useMemo(() => calculateLeaveStats(), [user, calendarData, leaveUpdateTrigger]);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentMonth = calendarData[selectedMonth];

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => (prev > 0 ? prev - 1 : calendarData.length - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => (prev < calendarData.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Card className="border-none shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="w-5 h-5 text-primary" />
              Academic Calendar 2025-26 (Even Semester)
            </CardTitle>
            {isAdmin() && (
              <Badge variant="secondary" className="text-xs">
                Admin: Click days to add notes
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Working Days</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{leaveStats.workingDays}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border border-red-200 dark:border-red-800 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                  <UserX className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Taken Leave</p>
                  <p className="text-xl font-bold text-red-700 dark:text-red-300">{leaveStats.takenLeaves}</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800 hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Available</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{leaveStats.availableLeaves}/{leaveStats.totalAvailableLeaves}</p>
                </div>
              </div>
              {leaveStats.totalMonths > 0 && (
                <p className="text-[9px] text-green-600/70 dark:text-green-400/70 mt-1">
                  {leaveStats.totalMonths} months × 3 = {leaveStats.totalAvailableLeaves}
                </p>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-primary">
                {currentMonth.name} {currentMonth.year}
              </h3>
              
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
              {calendarData.map((month, index) => (
                <button
                  key={`${month.name}-${month.year}`}
                  onClick={() => setSelectedMonth(index)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    selectedMonth === index
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {month.name.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-bold text-muted-foreground p-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: currentMonth.startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {currentMonth.days.map((day) => (
                <div
                  key={day.date}
                  className={`aspect-square border-2 rounded-lg p-1.5 flex flex-col items-center justify-center text-center transition-all ${isAdmin() ? 'cursor-pointer' : ''} ${getDayColor(day.type)} group relative`}
                  onClick={() => isAdmin() && handleEditDay(selectedMonth, day)}
                >
                  <span className="text-sm font-bold leading-none">{day.date}</span>
                  {day.event && (
                    <span className="text-[7px] leading-tight font-semibold mt-0.5 line-clamp-1">
                      {day.event}
                    </span>
                  )}
                  
                  {day.adminNote && (
                    <div className="absolute top-0.5 right-0.5">
                      <Plus className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  
                  {(day.event || day.assignment || day.unit || day.adminNote) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 max-w-xs">
                      {day.event && <div className="font-semibold">{day.event}</div>}
                      {day.assignment && <div className="text-[10px]">{day.assignment}</div>}
                      {day.unit && <div className="text-[10px]">{day.unit}</div>}
                      {day.cumDays !== undefined && <div className="text-[10px]">Day {day.cumDays}</div>}
                      {day.adminNote && (
                        <div className="text-[10px] text-yellow-300 mt-1 border-t border-yellow-400/30 pt-1">
                          📝 {day.adminNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border">
            <h4 className="font-semibold mb-2 text-xs text-muted-foreground">LEGEND</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-white dark:bg-slate-800 border-slate-300" />
                <span>Working</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-pink-200 border-pink-300" />
                <span>Holiday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-rose-300 border-rose-400" />
                <span>CAT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-amber-200 border-amber-400" />
                <span>Club Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-sky-200 border-sky-400" />
                <span>CCM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-emerald-200 border-emerald-400" />
                <span>Reopening</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-lime-200 border-lime-400" />
                <span>Feedback</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 bg-purple-200 border-purple-400" />
                <span>Exams</span>
              </div>
            </div>
            {isAdmin() && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Plus className="w-3 h-3 text-primary" />
                <span>Admins can add notes - base calendar stays unchanged</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isAdmin() && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                Add Note - {editingDay?.month} {editingDay?.date}, 2026
              </DialogTitle>
            </DialogHeader>
            
            {editingDay && (
              <div className="grid gap-4 py-4">
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <strong>Note:</strong> Base calendar (holidays, CAT, events) cannot be changed. Add extra information visible to students.
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="adminNote">Admin Note</Label>
                  <Textarea
                    id="adminNote"
                    value={editingDay.note}
                    onChange={(e) => setEditingDay({ ...editingDay, note: e.target.value })}
                    placeholder="e.g., 'Bring project reports', 'Lab preparation required'"
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNote}>
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AcademicCalendar;
