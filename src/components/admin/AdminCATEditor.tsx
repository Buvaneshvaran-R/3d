import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, X, Edit2, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface CATMark {
  id?: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  cat1_marks: number;
  cat1_max: number;
  cat2_marks: number;
  cat2_max: number;
  cat3_marks: number;
  cat3_max: number;
}

export const AdminCATEditor = () => {
  const { selectedStudent } = useAuth();
  const { toast } = useToast();
  const [catMarks, setCatMarks] = useState<CATMark[]>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedStudent?.id) {
      loadSubjects();
      loadCATMarks();
    }
  }, [selectedStudent?.id]);

  const loadSubjects = async () => {
    try {
      const { data, error} = await supabase.from('subjects').select('*').order('name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadCATMarks = async () => {
    if (!selectedStudent?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('cat_marks').select('*, subjects(name, code)').eq('student_id', selectedStudent.id);
      if (error) throw error;
      const formattedData = (data || []).map(item => ({
        id: item.id,
        subject_id: item.subject_id,
        subject_name: item.subjects?.name || '',
        subject_code: item.subjects?.code || '',
        cat1_marks: item.cat1_marks || 0,
        cat1_max: item.cat1_max || 50,
        cat2_marks: item.cat2_marks || 0,
        cat2_max: item.cat2_max || 25,
        cat3_marks: item.cat3_marks || 0,
        cat3_max: item.cat3_max || 50,
      }));
      setCatMarks(formattedData);
    } catch (error) {
      console.error('Error loading CAT marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = () => {
    setCatMarks([...catMarks, { subject_id: '', subject_name: '', subject_code: '', cat1_marks: 0, cat1_max: 50, cat2_marks: 0, cat2_max: 25, cat3_marks: 0, cat3_max: 50 }]);
  };

  const handleUpdateMark = (index: number, field: keyof CATMark, value: string | number) => {
    const updated = [...catMarks];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'subject_id') {
      const subject = subjects.find(s => s.id === value);
      if (subject) {
        updated[index].subject_name = subject.name;
        updated[index].subject_code = subject.code;
      }
    }
    setCatMarks(updated);
  };

  const handleDeleteMark = (index: number) => {
    setCatMarks(catMarks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedStudent?.id) return;
    setSaving(true);
    try {
      await supabase.from('cat_marks').delete().eq('student_id', selectedStudent.id);
      const marksToInsert = catMarks.filter(mark => mark.subject_id).map(mark => ({
        student_id: selectedStudent.id,
        subject_id: mark.subject_id,
        cat1_marks: mark.cat1_marks,
        cat1_max: mark.cat1_max,
        cat2_marks: mark.cat2_marks,
        cat2_max: mark.cat2_max,
        cat3_marks: mark.cat3_marks,
        cat3_max: mark.cat3_max,
      }));
      if (marksToInsert.length > 0) {
        const { error } = await supabase.from('cat_marks').insert(marksToInsert);
        if (error) throw error;
      }
      toast({ title: "Success", description: "CAT marks saved successfully" });
      setIsEditing(false);
      loadCATMarks();
    } catch (error) {
      console.error('Error saving CAT marks:', error);
      toast({ title: "Error", description: "Failed to save CAT marks", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedStudent) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please select a student to manage CAT marks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-card mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Admin: Manage CAT Marks for {selectedStudent.name}</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={() => { setIsEditing(false); loadCATMarks(); }} disabled={saving} variant="outline" size="sm" className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} size="sm" className="gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Marks
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading CAT marks...</p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            {catMarks.map((mark, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Subject</Label>
                  <Select value={mark.subject_id} onValueChange={(value) => handleUpdateMark(index, "subject_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">CAT I (Max: 50)</Label>
                    <Input type="number" value={mark.cat1_marks} onChange={(e) => handleUpdateMark(index, "cat1_marks", parseInt(e.target.value) || 0)} max={50} min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CAT II (Max: 25)</Label>
                    <Input type="number" value={mark.cat2_marks} onChange={(e) => handleUpdateMark(index, "cat2_marks", parseInt(e.target.value) || 0)} max={25} min={0} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CAT III (Max: 50)</Label>
                    <Input type="number" value={mark.cat3_marks} onChange={(e) => handleUpdateMark(index, "cat3_marks", parseInt(e.target.value) || 0)} max={50} min={0} />
                  </div>
                </div>

                <Button onClick={() => handleDeleteMark(index)} variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Remove Subject
                </Button>
              </div>
            ))}
            <Button onClick={handleAddSubject} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Subject
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            {catMarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No CAT marks entered yet. Click "Edit Marks" to add data.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{catMarks.length} subject(s) recorded</p>
                <p className="text-xs text-muted-foreground">Click "Edit Marks" to modify</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
