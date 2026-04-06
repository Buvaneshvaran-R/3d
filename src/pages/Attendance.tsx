import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, TrendingUp, TrendingDown, AlertCircle, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { AdminAttendanceEditor } from "@/components/admin/AdminAttendanceEditor";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const Attendance = () => {
  const { isAdmin, user, selectedStudent } = useAuth();
  const [attendanceData, setAttendanceData] = useState<Array<{
    subject: string;
    code: string;
    attended: number;
    total: number;
    percentage: number;
  }>>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<Array<{
    month: string;
    [key: string]: string | number; // For dynamic subject percentages
  }>>([]);;
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Fetch attendance data from database
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Get student ID
        let studentId;
        if (isAdmin()) {
          // Admin: use selected student if available
          if (!selectedStudent?.id) {
            setAttendanceData([]);
            setLoading(false);
            return;
          }
          studentId = selectedStudent.id;
        } else {
          // Get current student's ID
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', user.id)
            .single();
          
          if (!studentData) return;
          studentId = studentData.id;
        }

        // Build query with optional date filtering
        let query = supabase
          .from('attendance')
          .select(`
            subject_id,
            status,
            date,
            subjects (
              code,
              name
            )
          `)
          .eq('student_id', studentId);

        // Apply date filters if set
        if (startDate) {
          query = query.gte('date', format(startDate, 'yyyy-MM-dd'));
        }
        if (endDate) {
          query = query.lte('date', format(endDate, 'yyyy-MM-dd'));
        }

        const { data: attendanceRecords, error } = await query;

        if (error) throw error;

        // Group by subject and calculate percentages
        const subjectMap = new Map();
        const monthSubjectMap = new Map(); // For month-wise subject attendance

        attendanceRecords?.forEach((record: { subject_id: string; status: string; date: string; subjects?: { code: string; name: string } }) => {
          const subjectId = record.subject_id;
          const subjectCode = record.subjects?.code;
          const subjectName = record.subjects?.name;

          // Subject-wise calculation
          if (!subjectMap.has(subjectId)) {
            subjectMap.set(subjectId, {
              subject: subjectName,
              code: subjectCode,
              attended: 0,
              total: 0,
              percentage: 0
            });
          }

          const subjectData = subjectMap.get(subjectId);
          subjectData.total += 1;
          if (record.status === 'Present') {
            subjectData.attended += 1;
          }
          subjectData.percentage = Math.round((subjectData.attended / subjectData.total) * 100);

          // Month-wise subject calculation
          if (record.date) {
            const date = parseISO(record.date);
            const monthYear = format(date, 'MMM yyyy');
            const key = `${monthYear}-${subjectCode}`;
            
            if (!monthSubjectMap.has(key)) {
              monthSubjectMap.set(key, {
                month: monthYear,
                subjectCode: subjectCode,
                subjectName: subjectName,
                attended: 0,
                total: 0,
                percentage: 0
              });
            }

            const monthData = monthSubjectMap.get(key);
            monthData.total += 1;
            if (record.status === 'Present') {
              monthData.attended += 1;
            }
            monthData.percentage = Math.round((monthData.attended / monthData.total) * 100);
          }
        });

        setAttendanceData(Array.from(subjectMap.values()));
        
        // Transform month-subject data for stacked/grouped bar chart
        const monthMap = new Map();
        monthSubjectMap.forEach((value) => {
          if (!monthMap.has(value.month)) {
            monthMap.set(value.month, { month: value.month });
          }
          const monthEntry = monthMap.get(value.month);
          monthEntry[value.subjectCode] = value.percentage;
        });

        // Sort months chronologically
        const sortedMonthly = Array.from(monthMap.values()).sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        });
        setMonthlyAttendance(sortedMonthly);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        () => {
          fetchAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, selectedStudent, startDate, endDate]);

  const COLORS = ['hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(217, 91%, 60%)', 'hsl(280, 89%, 60%)', 'hsl(24, 95%, 53%)'];

  const chartData = attendanceData.map((item, index) => ({
    name: item.code,
    value: item.percentage,
    fullName: item.subject,
    color: COLORS[index % COLORS.length]
  }));

  const overallAttendance = attendanceData.length > 0 
    ? Math.round(attendanceData.reduce((acc, curr) => acc + curr.percentage, 0) / attendanceData.length)
    : 0;
    
  const bestAttendance = attendanceData.length > 0
    ? attendanceData.reduce((max, item) => item.percentage > max.percentage ? item : max, attendanceData[0])
    : null;
    
  const worstAttendance = attendanceData.length > 0
    ? attendanceData.reduce((min, item) => item.percentage < min.percentage ? item : min, attendanceData[0])
    : null;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-success";
    if (percentage >= 75) return "bg-warning";
    return "bg-destructive";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading attendance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="page-header mb-0">Attendance</h1>
        
        {/* Date Filter */}
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {/* Admin Editor */}
      {isAdmin() && <AdminAttendanceEditor />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Attendance</p>
                <p className="text-4xl font-bold text-foreground mt-2">{overallAttendance}%</p>
              </div>
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-success text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Above minimum requirement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Best Attendance</p>
                <p className="text-4xl font-bold text-success mt-2">{bestAttendance ? `${bestAttendance.percentage}%` : '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">{bestAttendance?.subject || '—'}</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-4xl font-bold text-warning mt-2">{worstAttendance ? `${worstAttendance.percentage}%` : '—'}</p>
                <p className="text-xs text-muted-foreground mt-1">{worstAttendance?.subject || '—'}</p>
              </div>
              <div className="w-16 h-16 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card className="border-none shadow-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            Subject-wise Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  <th>Attended / Total</th>
                  <th>Percentage</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    <td className="font-medium">{item.subject}</td>
                    <td className="text-muted-foreground">{item.code}</td>
                    <td>
                      <span className="font-semibold text-foreground">{item.attended}</span>
                      <span className="text-muted-foreground"> / {item.total}</span>
                    </td>
                    <td>
                      <span className={`font-bold ${
                        item.percentage >= 90 ? "text-success" :
                        item.percentage >= 75 ? "text-warning" : "text-destructive"
                      }`}>
                        {item.percentage}%
                      </span>
                    </td>
                    <td className="w-40">
                      <div className="progress-bar">
                        <div
                          className={`progress-bar-fill ${getProgressColor(item.percentage)}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Chart */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle>Subject-wise Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: { payload: { fullName: string } }) => [
                    `${value}%`,
                    props.payload.fullName
                  ]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value: string, entry: { payload: { fullName: string } }) => entry.payload.fullName}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Attendance Bar Chart */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle>Month-wise Subject Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyAttendance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  label={{ value: 'Attendance %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {attendanceData.map((subject, index) => (
                  <Bar 
                    key={subject.code}
                    dataKey={subject.code} 
                    name={subject.subject}
                    fill={COLORS[index % COLORS.length]}
                    radius={[8, 8, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
