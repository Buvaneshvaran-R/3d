import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AllocationTemplateRow {
  block_code: string;
  floor_number: number;
  room_number: number;
  day_of_week: string;
  slot_start: string;
  slot_end: string;
  subject: string;
  teacher_name: string;
  department: string;
  section: string;
  status?: string;
}

const ALLOCATION_OWNER_EMAIL = "chanuadmin@rit.edu";

const ClassroomAllocation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allocationUploadText, setAllocationUploadText] = useState("");
  const [isUploadingAllocations, setIsUploadingAllocations] = useState(false);
  const allocationFileRef = useRef<HTMLInputElement | null>(null);

  const canAccessAllocationModule = user?.email?.toLowerCase() === ALLOCATION_OWNER_EMAIL;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAllocationModule) {
    return (
      <div className="min-h-screen bg-background p-4 lg:p-8">
        <Card className="mx-auto max-w-2xl p-6">
          <h1 className="text-2xl font-bold">Classroom Allocation</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access restricted. This module is only available to {ALLOCATION_OWNER_EMAIL}.
          </p>
        </Card>
      </div>
    );
  }

  const normalizeAllocationTemplateRow = (row: Record<string, unknown>): AllocationTemplateRow => {
    const block = String(row.block_code || row.block || "").toUpperCase().trim();
    const day = String(row.day_of_week || row.day || "").trim();

    const normalized: AllocationTemplateRow = {
      block_code: block,
      floor_number: Number(row.floor_number),
      room_number: Number(row.room_number),
      day_of_week: day,
      slot_start: String(row.slot_start || "").trim(),
      slot_end: String(row.slot_end || "").trim(),
      subject: String(row.subject || "").trim(),
      teacher_name: String(row.teacher_name || row.teacher || "").trim(),
      department: String(row.department || "").trim(),
      section: String(row.section || "").trim(),
      status: String(row.status || "SCHEDULED").trim().toUpperCase(),
    };

    const validBlocks = new Set(["A", "B", "C"]);
    const validDays = new Set(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    if (!validBlocks.has(normalized.block_code)) throw new Error(`Invalid block code: ${normalized.block_code}`);
    if (!Number.isInteger(normalized.floor_number) || normalized.floor_number < 1) throw new Error("Invalid floor_number");
    if (!Number.isInteger(normalized.room_number) || normalized.room_number < 1) throw new Error("Invalid room_number");
    if (!validDays.has(normalized.day_of_week)) throw new Error(`Invalid day_of_week: ${normalized.day_of_week}`);
    if (!normalized.slot_start || !normalized.slot_end) throw new Error("slot_start and slot_end are required");
    if (!normalized.subject || !normalized.teacher_name) throw new Error("subject and teacher_name are required");

    return normalized;
  };

  const handleAllocationFilePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setAllocationUploadText(content);
    event.target.value = "";
  };

  const handleUploadAllocationTemplates = async () => {
    if (!allocationUploadText.trim()) {
      toast({
        title: "No data",
        description: "Paste JSON or choose a JSON file first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAllocations(true);
    try {
      const parsed = JSON.parse(allocationUploadText);
      const rawRows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.rows) ? parsed.rows : [];
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        throw new Error("JSON must be an array of rows or { rows: [...] }");
      }

      const rows = rawRows.map((row) => normalizeAllocationTemplateRow(row as Record<string, unknown>));

      const { error } = await supabase
        .from("classroom_allocation_templates")
        .upsert(rows, {
          onConflict: "block_code,floor_number,room_number,day_of_week,slot_start",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Upload completed",
        description: `${rows.length} allocation template rows uploaded successfully.`,
      });
    } catch (error) {
      console.error("Allocation upload failed:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to upload allocation data.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAllocations(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="p-6">
          <h1 className="text-2xl font-bold">Classroom Allocation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload timetable allocation JSON to classroom_allocation_templates.
          </p>
        </Card>

        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              <p className="text-sm font-semibold">Allocation Data Upload</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload JSON rows in array format or {`{ rows: [...] }`} format.
            </p>

            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
              <p className="font-semibold">Required Columns</p>
              <p>
                block_code, floor_number, room_number, day_of_week, slot_start, slot_end, subject, teacher_name, department, section
              </p>
              <p className="font-semibold">Rules</p>
              <p>block_code: A | B | C, day_of_week: Monday to Friday, time format: HH:MM (24-hour).</p>
              <p>status is optional (default is SCHEDULED).</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={allocationFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleAllocationFilePick}
              />
              <Button
                variant="outline"
                onClick={() => allocationFileRef.current?.click()}
                disabled={isUploadingAllocations}
              >
                Choose JSON File
              </Button>
              <Button
                onClick={handleUploadAllocationTemplates}
                disabled={isUploadingAllocations}
              >
                {isUploadingAllocations ? "Uploading..." : "Upload to Supabase"}
              </Button>
            </div>

            <textarea
              className="min-h-[220px] w-full rounded-md border bg-background p-2 text-sm"
              placeholder="Paste allocation JSON here"
              value={allocationUploadText}
              onChange={(e) => setAllocationUploadText(e.target.value)}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ClassroomAllocation;
