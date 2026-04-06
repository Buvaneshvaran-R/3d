import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const timeSlots = ["9:00 - 9:50", "9:50 - 10:40", "10:50 - 11:40", "11:40 - 12:30", "1:30 - 2:20", "2:20 - 3:10", "3:20 - 4:10"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const AdminTimeTableEditor = () => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [timetable, setTimetable] = useState<Record<string, Record<string, string | null>>>({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [selectedSlot, setSelectedSlot] = useState(timeSlots[0]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (selectedStudent) {
      fetchSubjects();
      loadTimetable();
    }
  }, [selectedStudent]);

  const fetchSubjects = async () => {
    if (!selectedStudent) return;
    
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
        .eq('student_id', selectedStudent.id);

      if (error) throw error;
      const enrolledSubjects = data?.map(item => item.subjects).filter(Boolean) || [];
      setSubjects(enrolledSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const loadTimetable = () => {
    if (!selectedStudent) return;
    
    try {
      const saved = localStorage.getItem(`timetable_${selectedStudent.id}`);
      if (saved) {
        setTimetable(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
    }
  };

  const handleSave = () => {
    if (!selectedStudent || !selectedSubject || !room) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const subject = subjects.find(s => s.id === selectedSubject);
      const updated = { ...timetable };
      
      if (!updated[selectedDay]) {
        updated[selectedDay] = {};
      }
      
      updated[selectedDay][selectedSlot] = {
        subject: subject.name,
        code: subject.code,
        room: room
      };

      localStorage.setItem(`timetable_${selectedStudent.id}`, JSON.stringify(updated));
      setTimetable(updated);
      
      toast({
        title: "Success",
        description: "Timetable updated successfully"
      });
      
      setSelectedSubject("");
      setRoom("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update timetable",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (day: string, slot: string) => {
    try {
      const updated = { ...timetable };
      if (updated[day]) {
        delete updated[day][slot];
      }
      
      localStorage.setItem(`timetable_${selectedStudent.id}`, JSON.stringify(updated));
      setTimetable(updated);
      
      toast({
        title: "Success",
        description: "Entry deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-none shadow-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Manage Timetable
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!selectedStudent ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>Please select a student to manage timetable</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
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
                <Label>Room</Label>
                <Input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., Lab 301"
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full md:w-auto gap-2">
              <Save className="w-4 h-4" />
              Save Entry
            </Button>

            {/* Current Timetable */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Current Timetable</h4>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Room</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => 
                      timeSlots.map(slot => {
                        const entry = timetable[day]?.[slot];
                        if (!entry) return null;
                        return (
                          <tr key={`${day}-${slot}`}>
                            <td>{day}</td>
                            <td>{slot}</td>
                            <td>{entry.code} - {entry.subject}</td>
                            <td>{entry.room}</td>
                            <td>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(day, slot)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
