import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Save, X, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LabSubject {
  subject: string;
  code: string;
  internal: number;
  viva: number;
  record: number;
  maxInternal: number;
  maxViva: number;
  maxRecord: number;
}

export const AdminLabEditor = () => {
  const { selectedStudent } = useAuth();
  const [labData, setLabData] = useState<LabSubject[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const calculateTotal = (item: LabSubject) => item.internal + item.viva + item.record;
  const calculateMaxTotal = (item: LabSubject) => item.maxInternal + item.maxViva + item.maxRecord;

  const handleAddSubject = () => {
    setLabData([
      ...labData,
      { subject: "", code: "", internal: 0, viva: 0, record: 0, maxInternal: 60, maxViva: 20, maxRecord: 20 }
    ]);
  };

  const handleUpdateSubject = (index: number, field: keyof LabSubject, value: string | number) => {
    const updated = [...labData];
    updated[index] = { ...updated[index], [field]: value };
    setLabData(updated);
  };

  const handleDeleteSubject = (index: number) => {
    setLabData(labData.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // API call to save Lab marks
    console.log("Saving Lab data:", labData);
    setIsEditing(false);
  };

  if (!selectedStudent) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please select a student to manage Lab marks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-card mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Admin: Manage Lab Marks</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleSave} size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="gap-2">
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
        {isEditing ? (
          <div className="space-y-4">
            {labData.map((item, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Lab Name</Label>
                    <Input
                      value={item.subject}
                      onChange={(e) => handleUpdateSubject(index, "subject", e.target.value)}
                      placeholder="Data Structures Lab"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Lab Code</Label>
                    <Input
                      value={item.code}
                      onChange={(e) => handleUpdateSubject(index, "code", e.target.value)}
                      placeholder="CS201L"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Internal (Max: 60)</Label>
                    <Input
                      type="number"
                      value={item.internal}
                      onChange={(e) => handleUpdateSubject(index, "internal", parseInt(e.target.value) || 0)}
                      max={item.maxInternal}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Viva (Max: 20)</Label>
                    <Input
                      type="number"
                      value={item.viva}
                      onChange={(e) => handleUpdateSubject(index, "viva", parseInt(e.target.value) || 0)}
                      max={item.maxViva}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Record (Max: 20)</Label>
                    <Input
                      type="number"
                      value={item.record}
                      onChange={(e) => handleUpdateSubject(index, "record", parseInt(e.target.value) || 0)}
                      max={item.maxRecord}
                    />
                  </div>
                </div>

                <div className="bg-secondary/50 p-3 rounded-md">
                  <p className="text-sm font-medium">
                    Total: {calculateTotal(item)} / {calculateMaxTotal(item)} marks
                  </p>
                </div>

                <Button
                  onClick={() => handleDeleteSubject(index)}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Lab
                </Button>
              </div>
            ))}

            <Button onClick={handleAddSubject} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Lab Subject
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            {labData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Lab marks entered yet. Click "Edit Marks" to add data.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {labData.length} lab(s) recorded
                </p>
                <p className="text-xs text-muted-foreground">
                  Click "Edit Marks" to modify
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
