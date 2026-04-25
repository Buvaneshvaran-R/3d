import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  IndianRupee,
  ListOrdered,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ---------- Types ----------

type PrintColor = "bw" | "color";
type PrintSide = "single" | "double";
type PrintOrientation = "portrait" | "landscape";
type PrintBinding = "none" | "soft" | "spiral";
type JobStatus =
  | "pending_payment"
  | "queued"
  | "printing"
  | "completed"
  | "cancelled"
  | "rejected";

interface PrintJob {
  id: string;
  jobCode?: string;
  originalJobCode?: string;
  originalJobId?: string;
  resubmittedAs?: string;
  queueNo: number;
  submittedBy: string;
  rollNo: string;
  fileName: string;
  pages: number;
  copies: number;
  color: PrintColor;
  side: PrintSide;
  orientation: PrintOrientation;
  binding: PrintBinding;
  printCost: number;
  bindingCost: number;
  amount: number;
  status: JobStatus;
  submittedAt: string;
  paymentId?: string;
  fileUrl?: string;
  studentEmail?: string;
  rejectionReason?: string;
  canResubmit?: boolean;
  heldAmount?: number;
  resubmitDeadline?: string;
  resubmittedAt?: string;
}

interface FileEntry {
  id: string;
  file: File;
  pagesInput: string;
  detectedPages: number | null;
  copiesInput: string;
  color: PrintColor;
  side: PrintSide;
  orientation: PrintOrientation;
  binding: PrintBinding;
}

// ---------- Mock initial queue data (FIFO order) ----------

const mockQueue: PrintJob[] = [
  {
    id: "job-001",
    queueNo: 1,
    submittedBy: "Arun Kumar",
    rollNo: "21CS001",
    fileName: "Assignment_DSA.pdf",
    pages: 12,
    copies: 1,
    color: "bw",
    side: "double",
    orientation: "portrait",
    binding: "none",
    printCost: 36,
    bindingCost: 0,
    amount: 36,
    status: "printing",
    submittedAt: "2026-03-13T08:10:00",
    paymentId: "pay_QxA12bXc",
  },
  {
    id: "job-002",
    queueNo: 2,
    submittedBy: "Priya S",
    rollNo: "21CS045",
    fileName: "Lab_Report_5.pdf",
    pages: 8,
    copies: 2,
    color: "color",
    side: "single",
    orientation: "portrait",
    binding: "soft",
    printCost: 80,
    bindingCost: 60,
    amount: 140,
    status: "queued",
    submittedAt: "2026-03-13T08:22:00",
    paymentId: "pay_Qx9KmTzR",
  },
  {
    id: "job-003",
    queueNo: 3,
    submittedBy: "Rahul V",
    rollNo: "21ME018",
    fileName: "Project_Report_Final.pdf",
    pages: 40,
    copies: 1,
    color: "bw",
    side: "double",
    orientation: "portrait",
    binding: "spiral",
    printCost: 120,
    bindingCost: 50,
    amount: 170,
    status: "queued",
    submittedAt: "2026-03-13T08:35:00",
    paymentId: "pay_QxBnw0Pt",
  },
  {
    id: "job-004",
    queueNo: 4,
    submittedBy: "Sneha R",
    rollNo: "21EC030",
    fileName: "Circuit_Diagrams.pdf",
    pages: 6,
    copies: 3,
    color: "color",
    side: "single",
    orientation: "landscape",
    binding: "none",
    printCost: 90,
    bindingCost: 0,
    amount: 90,
    status: "queued",
    submittedAt: "2026-03-13T09:00:00",
    paymentId: "pay_QxD2vSqM",
  },
];

// ---------- DB mapper ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToJob(row: { [key: string]: any }): PrintJob {
  return {
    id: row.id,
    jobCode: row.job_code ?? undefined,
    originalJobCode: row.original_job_code ?? undefined,
    originalJobId: row.original_job_id ?? row.source_job_id ?? undefined,
    resubmittedAs: row.resubmitted_as ?? undefined,
    queueNo: row.queue_no,
    submittedBy: row.submitted_by,
    rollNo: row.roll_no,
    fileName: row.file_name,
    pages: row.pages,
    copies: row.copies,
    color: row.color as PrintColor,
    side: row.side as PrintSide,
    orientation: row.orientation as PrintOrientation,
    binding: row.binding as PrintBinding,
    printCost: row.print_cost,
    bindingCost: row.binding_cost,
    amount: row.amount,
    status: row.status as JobStatus,
    submittedAt: row.submitted_at,
    paymentId: row.payment_id ?? undefined,
    fileUrl: row.file_url ?? undefined,
    studentEmail: row.student_email ?? undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    canResubmit: typeof row.can_resubmit === "boolean" ? row.can_resubmit : undefined,
    heldAmount:
      typeof row.carried_amount === "number"
        ? row.carried_amount
        : typeof row.held_amount === "number"
        ? row.held_amount
        : undefined,
    resubmitDeadline: row.resubmit_deadline ?? undefined,
    resubmittedAt: row.resubmitted_at ?? undefined,
  };
}

// ---------- Helpers ----------

const RATES: Record<PrintColor, Record<PrintSide, number>> = {
  bw: { single: 2, double: 3 },
  color: { single: 5, double: 8 },
};

const BINDING_RATES: Record<PrintBinding, number> = {
  none: 0,
  soft: 30,
  spiral: 50,
};

const BINDING_LABELS: Record<PrintBinding, string> = {
  none: "No Binding",
  soft: "Soft Binding",
  spiral: "Spiral Binding",
};

function calcCosts(
  pages: number,
  copies: number,
  color: PrintColor,
  side: PrintSide,
  binding: PrintBinding
): { printCost: number; bindingCost: number; amount: number } {
  const printCost = pages * copies * RATES[color][side];
  const bindingCost = BINDING_RATES[binding]; // charged once per job, not per copy
  return { printCost, bindingCost, amount: printCost + bindingCost };
}

async function buildFallbackPrintJobCode(): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `PRN-${datePart}-`;

  const { data, error } = await supabase
    .from("print_jobs")
    .select("job_code")
    .ilike("job_code", `${prefix}%`)
    .order("job_code", { ascending: false })
    .limit(1);

  // If job_code column/query isn't available yet, fall back to a deterministic random suffix.
  if (error || !data || data.length === 0) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}${randomSuffix}`;
  }

  const lastCode = data[0]?.job_code as string | undefined;
  const lastSeq = lastCode ? parseInt(lastCode.split("-").pop() || "0", 10) : 0;
  const nextSeq = Number.isFinite(lastSeq) && lastSeq > 0 ? lastSeq + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFileTypeMeta(fileName: string): { label: string; bg: string; text: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")                                    return { label: "PDF",  bg: "bg-red-600",    text: "text-white" };
  if (["doc", "docx"].includes(ext))                   return { label: "DOC",  bg: "bg-blue-600",   text: "text-white" };
  if (["xls", "xlsx"].includes(ext))                   return { label: "XLS",  bg: "bg-green-600",  text: "text-white" };
  if (["ppt", "pptx"].includes(ext))                   return { label: "PPT",  bg: "bg-orange-500", text: "text-white" };
  if (["jpg", "jpeg"].includes(ext))                   return { label: "JPG",  bg: "bg-purple-500", text: "text-white" };
  if (ext === "png")                                   return { label: "PNG",  bg: "bg-purple-500", text: "text-white" };
  if (["gif", "webp", "svg"].includes(ext))            return { label: ext.toUpperCase(), bg: "bg-purple-400", text: "text-white" };
  if (ext === "txt")                                   return { label: "TXT",  bg: "bg-gray-500",   text: "text-white" };
  return { label: ext.toUpperCase() || "FILE", bg: "bg-gray-400", text: "text-white" };
}

const FileTypeBadge = ({ fileName }: { fileName: string }) => {
  const { label, bg, text } = getFileTypeMeta(fileName);
  return (
    <span className={cn("inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide flex-shrink-0", bg, text)}>
      {label}
    </span>
  );
};

const statusConfig: Record<
  JobStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending_payment: {
    label: "Pending Payment",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle,
  },
  queued: {
    label: "Queued",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Clock,
  },
  printing: {
    label: "Printing",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: RefreshCw,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
  },
};

// ---------- QR Modal ----------

interface PaymentModalProps {
  open: boolean;
  jobs: PrintJob[];
  onConfirm: (jobIds: string[]) => void;
  onClose: () => void;
}

interface ResubmitPaymentModalProps {
  open: boolean;
  additionalAmount: number;
  fileName: string;
  onConfirm: () => void;
  onClose: () => void;
}

const PaymentModal = ({ open, jobs, onConfirm, onClose }: PaymentModalProps) => {
  const [paid, setPaid] = useState(false);

  if (!jobs.length) return null;

  const totalAmount = jobs.reduce((s, j) => s + j.amount, 0);

  const handleConfirm = () => {
    setPaid(true);
    setTimeout(() => {
      onConfirm(jobs.map((j) => j.id));
      setPaid(false);
    }, 1200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Order breakdown — shown ABOVE the QR code */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            {jobs.map((job, i) => (
              <div key={job.id} className="space-y-1">
                {jobs.length > 1 && (
                  <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                    File {i + 1}: {job.fileName}
                  </p>
                )}
                {jobs.length === 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File</span>
                    <span className="font-medium truncate max-w-[160px]">{job.fileName}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {job.pages}pg × {job.copies} {job.copies === 1 ? "copy" : "copies"} × ₹{RATES[job.color][job.side]} ({job.color === "bw" ? "B&W" : "Color"} {job.side === "single" ? "Single" : "Double"})
                  </span>
                  <span>₹{job.printCost}</span>
                </div>
                {job.bindingCost > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{BINDING_LABELS[job.binding]}</span>
                    <span>₹{job.bindingCost}</span>
                  </div>
                )}
                {jobs.length > 1 && i < jobs.length - 1 && (
                  <div className="border-t border-border/40 mt-1" />
                )}
              </div>
            ))}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>Total Amount</span>
              <span className="text-primary">₹{totalAmount}</span>
            </div>
          </div>

          {/* Razorpay QR */}
          <div className="flex flex-col items-center gap-3">
            <div className="border-2 border-primary/20 rounded-xl p-3 bg-white">
              {/* Razorpay branding */}
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="w-5 h-5 rounded bg-[#072654] flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">R</span>
                </div>
                <span className="text-xs font-semibold text-[#072654]">Razorpay</span>
              </div>

              {/* QR Code placeholder grid */}
              <div className="w-44 h-44 relative">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Corner squares */}
                  <rect x="10" y="10" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="20" y="20" width="30" height="30" rx="2" fill="#072654"/>
                  <rect x="140" y="10" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="150" y="20" width="30" height="30" rx="2" fill="#072654"/>
                  <rect x="10" y="140" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="20" y="150" width="30" height="30" rx="2" fill="#072654"/>
                  {/* Data pattern */}
                  {[70,80,90,100,110,120,130].map((x) =>
                    [10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180].map((y) =>
                      Math.sin(x * y * 0.003 + x * 0.1) > 0.2 ? (
                        <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" rx="1" fill="#072654"/>
                      ) : null
                    )
                  )}
                  {[10,20,30,40,50,60].map((x) =>
                    [70,80,90,100,110,120,130].map((y) =>
                      Math.cos(x * y * 0.004 + y * 0.12) > 0.3 ? (
                        <rect key={`l-${x}-${y}`} x={x} y={y} width="8" height="8" rx="1" fill="#072654"/>
                      ) : null
                    )
                  )}
                  {[140,150,160,170,180].map((x) =>
                    [70,80,90,100,110,120,130].map((y) =>
                      Math.sin(x * 0.07 + y * 0.09) > 0.1 ? (
                        <rect key={`r-${x}-${y}`} x={x} y={y} width="8" height="8" rx="1" fill="#072654"/>
                      ) : null
                    )
                  )}
                  {/* Center logo */}
                  <rect x="84" y="84" width="32" height="32" rx="4" fill="white" stroke="#072654" strokeWidth="1"/>
                  <text x="100" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#072654">₹</text>
                </svg>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-1">
                Scan with any UPI app
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">RIT Print Services</p>
              <p className="text-xs text-muted-foreground">UPI: ritprint@razorpay</p>
            </div>
          </div>

          {/* Action buttons */}
          {!paid ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1 gap-2" onClick={handleConfirm}>
                <CheckCircle2 className="w-4 h-4" />
                Payment Done
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-semibold">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
              Payment Confirmed! Adding to queue...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ResubmitPaymentModal = ({
  open,
  additionalAmount,
  fileName,
  onConfirm,
  onClose,
}: ResubmitPaymentModalProps) => {
  const [paid, setPaid] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    setPaid(true);
    setTimeout(() => {
      onConfirm();
      setPaid(false);
    }, 1200);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            Additional Payment Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-medium truncate max-w-[180px]">{fileName}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>Pay Now</span>
              <span className="text-primary">₹{additionalAmount}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="border-2 border-primary/20 rounded-xl p-3 bg-white">
              <div className="flex items-center justify-center gap-1 mb-2">
                <div className="w-5 h-5 rounded bg-[#072654] flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">R</span>
                </div>
                <span className="text-xs font-semibold text-[#072654]">Razorpay</span>
              </div>
              <div className="w-44 h-44 relative">
                <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="20" y="20" width="30" height="30" rx="2" fill="#072654"/>
                  <rect x="140" y="10" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="150" y="20" width="30" height="30" rx="2" fill="#072654"/>
                  <rect x="10" y="140" width="50" height="50" rx="4" fill="none" stroke="#072654" strokeWidth="6"/>
                  <rect x="20" y="150" width="30" height="30" rx="2" fill="#072654"/>
                  {[70,80,90,100,110,120,130].map((x) =>
                    [10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180].map((y) =>
                      Math.sin(x * y * 0.003 + x * 0.1) > 0.2 ? (
                        <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" rx="1" fill="#072654"/>
                      ) : null
                    )
                  )}
                  <rect x="84" y="84" width="32" height="32" rx="4" fill="white" stroke="#072654" strokeWidth="1"/>
                  <text x="100" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#072654">₹</text>
                </svg>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-1">Scan with any UPI app</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">RIT Print Services</p>
              <p className="text-xs text-muted-foreground">UPI: ritprint@razorpay</p>
            </div>
          </div>

          {!paid ? (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleConfirm}>
                <CheckCircle2 className="w-4 h-4" />
                Payment Done
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-semibold">
              <CheckCircle2 className="w-5 h-5 animate-bounce" />
              Payment Confirmed! Resubmitting...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Upload Form ----------

interface UploadFormProps {
  onSubmit: (items: Array<{ job: Omit<PrintJob, "id" | "queueNo" | "status" | "submittedAt">; file: File }>) => void;
  submitterName: string;
  rollNo: string;
  resubmitJob?: PrintJob | null;
  resubmitCreditAmount?: number;
  resubmitReason?: string;
  onCancelResubmit?: () => void;
}

function makeEntryFromJob(job: PrintJob, file: File): FileEntry {
  return {
    id: Math.random().toString(36).slice(2),
    file,
    pagesInput: String(job.pages),
    detectedPages: null,
    copiesInput: String(job.copies),
    color: job.color,
    side: job.side,
    orientation: job.orientation,
    binding: job.binding,
  };
}

// Inline button-group toggle for print options — selected=dark pill, unselected=plain text
function OptionToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "text-sm transition-all",
            value === opt.value
              ? "bg-blue-600 text-white font-semibold rounded-full px-2.5 py-0.5"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function parsePages(pagesInput: string): number {
  const trimmed = pagesInput.trim();
  const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    if (start >= 1 && end >= start) return end - start + 1;
  }
  return Math.max(1, parseInt(trimmed) || 1);
}

function parseCopies(copiesInput: string): number {
  return Math.max(1, Math.min(20, parseInt(copiesInput) || 1));
}

const UploadForm = ({
  onSubmit,
  submitterName,
  rollNo,
  resubmitJob,
  resubmitCreditAmount,
  resubmitReason,
  onCancelResubmit,
}: UploadFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!resubmitJob) {
      return;
    }
    const placeholder = new File([""], resubmitJob.fileName, { type: "application/octet-stream" });
    setEntries([makeEntryFromJob(resubmitJob, placeholder)]);
  }, [resubmitJob?.id]);

  const addFiles = (files: File[]) => {
    const incoming = resubmitJob ? files.slice(0, 1) : files;
    const newEntries: FileEntry[] = incoming.map((f) => {
      if (!resubmitJob) {
        return {
          id: Math.random().toString(36).slice(2),
          file: f,
          pagesInput: "1",
          detectedPages: null,
          copiesInput: "1",
          color: "bw" as PrintColor,
          side: "single" as PrintSide,
          orientation: "portrait" as PrintOrientation,
          binding: "none" as PrintBinding,
        };
      }
      return makeEntryFromJob(resubmitJob, f);
    });
    if (resubmitJob) {
      setEntries(newEntries);
    } else {
      setEntries((prev) => [...prev, ...newEntries]);
    }
    // auto-detect pages for PDFs asynchronously to avoid blocking UI
    newEntries.forEach((entry) => {
      if (entry.file.name.split(".").pop()?.toLowerCase() !== "pdf") return;
      
      // Skip page detection for very large files (>50MB) to prevent UI blocking
      if (entry.file.size > 50_000_000) {
        console.log(`Skipping page detection for large file: ${entry.file.name}`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => {
          const content = e.target?.result as string;
          const matches = [...content.matchAll(/\/Count\s+(\d+)/g)];
          if (matches.length > 0) {
            const total = Math.max(...matches.map((m) => parseInt(m[1])));
            if (total > 0) {
              setEntries((prev) =>
                prev.map((en) =>
                  en.id === entry.id
                    ? { ...en, detectedPages: total, pagesInput: `1-${total}` }
                    : en
                )
              );
            }
          }
        }, 0);
      };
      reader.readAsBinaryString(entry.file);
    });
  };

  const updateEntry = (id: string, updates: Partial<FileEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const getEntryCosts = (entry: FileEntry) => {
    const pages = parsePages(entry.pagesInput);
    const copies = parseCopies(entry.copiesInput);
    return calcCosts(pages, copies, entry.color, entry.side, entry.binding);
  };

  const totalAmount = entries.reduce((sum, e) => sum + getEntryCosts(e).amount, 0);
  const alreadyPaid = resubmitCreditAmount ?? 0;
  const additionalAmount = Math.max(0, totalAmount - alreadyPaid);

  const handleSubmit = () => {
    if (!entries.length) return;
    const sourceEntries = resubmitJob ? entries.slice(0, 1) : entries;
    const items = sourceEntries.map((entry) => {
      const pages = parsePages(entry.pagesInput);
      const copies = parseCopies(entry.copiesInput);
      const { printCost, bindingCost, amount } = calcCosts(pages, copies, entry.color, entry.side, entry.binding);
      return {
        job: {
          submittedBy: submitterName,
          rollNo,
          fileName: entry.file.name,
          pages,
          copies,
          color: entry.color,
          side: entry.side,
          orientation: entry.orientation,
          binding: entry.binding,
          printCost,
          bindingCost,
          amount,
          paymentId: undefined,
        } as Omit<PrintJob, "id" | "queueNo" | "status" | "submittedAt">,
        file: entry.file,
      };
    });
    onSubmit(items);
    setEntries([]);
  };

  const isResubmitMode = !!resubmitJob;
  const hasRealFileInResubmit = !isResubmitMode || (entries[0] && entries[0].file.size > 0);

  return (
    <Card className="border-none shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="w-5 h-5 text-primary" />
          {isResubmitMode ? "Fix & Resubmit Job" : "Submit Print Job"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isResubmitMode && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
            {resubmitReason && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 font-medium">
                Rejected reason: {resubmitReason}
              </p>
            )}
            <p className="text-sm font-semibold text-slate-800">This job was rejected. Upload the corrected file and resubmit.</p>
            {resubmitJob?.jobCode && (
              <p className="text-xs text-slate-600">Print Job ID: <span className="font-semibold text-slate-800">{resubmitJob.jobCode}</span></p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">Already Paid</p>
                <p className="text-lg font-bold text-emerald-800">₹{alreadyPaid}</p>
              </div>
              <div className={cn(
                "rounded-lg border px-3 py-2",
                additionalAmount > 0
                  ? "border-orange-200 bg-orange-50"
                  : "border-sky-200 bg-sky-50"
              )}>
                <p className={cn(
                  "text-[11px] uppercase tracking-wide",
                  additionalAmount > 0 ? "text-orange-700" : "text-sky-700"
                )}>
                  {additionalAmount > 0 ? "Additional Payment" : "Payment Status"}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  additionalAmount > 0 ? "text-orange-800" : "text-sky-800"
                )}>
                  {additionalAmount > 0 ? `₹${additionalAmount}` : "No extra payment"}
                </p>
              </div>
            </div>
            {onCancelResubmit && (
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={onCancelResubmit}>
                Cancel Resubmission
              </Button>
            )}
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200",
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : entries.length
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.txt"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-1.5">
            <Upload className="w-8 h-8 text-muted-foreground/50" />
            <p className="font-medium text-sm text-foreground">
              {isResubmitMode
                ? "Upload corrected file"
                : entries.length
                ? "Add more files"
                : "Drop files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isResubmitMode
                ? "Replaces the rejected file and keeps your existing payment"
                : "PDF, Word, Excel, PPT, Image — multiple files supported"}
            </p>
          </div>
        </div>

        {/* File entries list */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => {
              const { printCost, bindingCost, amount } = getEntryCosts(entry);
              const pages = parsePages(entry.pagesInput);
              const copies = parseCopies(entry.copiesInput);
              return (
                <div key={entry.id} className="border border-border rounded-xl p-3 space-y-3 bg-muted/20">
                  {/* File header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileTypeBadge fileName={entry.file.name} />
                      <span className="text-sm font-medium truncate flex-1 min-w-0">{entry.file.name}</span>
                      {entry.detectedPages !== null && (
                        <span className="text-xs text-green-600 font-medium flex-shrink-0">
                          {entry.detectedPages}pg
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0 p-1"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pages & Copies row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Pages</Label>
                      <Input
                        type="text"
                        placeholder="e.g. 10 or 1-10"
                        value={entry.pagesInput}
                        className="h-8 text-xs"
                        onChange={(e) => updateEntry(entry.id, { pagesInput: e.target.value })}
                        onBlur={() => {
                          const t = entry.pagesInput.trim();
                          if (!/^\d+\s*-\s*\d+$/.test(t)) {
                            updateEntry(entry.id, { pagesInput: String(Math.max(1, parseInt(t) || 1)) });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Copies</Label>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={entry.copiesInput}
                        className="h-8 text-xs"
                        onChange={(e) => updateEntry(entry.id, { copiesInput: e.target.value })}
                        onBlur={() => updateEntry(entry.id, { copiesInput: String(parseCopies(entry.copiesInput)) })}
                      />
                    </div>
                  </div>

                  {/* Print options — label left, buttons right */}
                  <div className="border border-border rounded-lg divide-y divide-border/60 text-sm">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Print Color</span>
                      <OptionToggle
                        options={[
                          { value: "bw" as PrintColor, label: "B&W" },
                          { value: "color" as PrintColor, label: "Color" },
                        ]}
                        value={entry.color}
                        onChange={(v) => updateEntry(entry.id, { color: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Sides</span>
                      <OptionToggle
                        options={[
                          { value: "single" as PrintSide, label: "Single" },
                          { value: "double" as PrintSide, label: "Double" },
                        ]}
                        value={entry.side}
                        onChange={(v) => updateEntry(entry.id, { side: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Orientation</span>
                      <OptionToggle
                        options={[
                          { value: "portrait" as PrintOrientation, label: "Portrait" },
                          { value: "landscape" as PrintOrientation, label: "Landscape" },
                        ]}
                        value={entry.orientation}
                        onChange={(v) => updateEntry(entry.id, { orientation: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-muted-foreground">Binding</span>
                      <OptionToggle
                        options={[
                          { value: "none" as PrintBinding, label: "None" },
                          { value: "soft" as PrintBinding, label: "Soft +₹30" },
                          { value: "spiral" as PrintBinding, label: "Spiral +₹50" },
                        ]}
                        value={entry.binding}
                        onChange={(v) => updateEntry(entry.id, { binding: v })}
                      />
                    </div>
                  </div>

                  {/* Per-file cost breakdown */}
                  <div className="text-xs bg-muted/40 rounded-lg px-3 py-2 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        Print ({pages}pg × {copies} {copies === 1 ? "copy" : "copies"} × ₹{RATES[entry.color][entry.side]})
                      </span>
                      <span>₹{printCost}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{BINDING_LABELS[entry.binding]}</span>
                      <span>{bindingCost > 0 ? `₹${bindingCost}` : "Free"}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-foreground border-t border-border/50 pt-1">
                      <span>Subtotal</span>
                      <span>₹{amount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rate guide */}
        <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs space-y-2">
          <p className="font-semibold text-foreground text-xs uppercase tracking-wide">Pricing Guide</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-foreground/80">B&amp;W Single: <strong>₹2/page</strong></span>
            <span className="text-foreground/80">B&amp;W Double: <strong>₹3/page</strong></span>
            <span className="text-foreground/80">Color Single: <strong>₹5/page</strong></span>
            <span className="text-foreground/80">Color Double: <strong>₹8/page</strong></span>
          </div>
          <div className="border-t border-border/50 pt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-foreground/80">No Binding: <strong>Free</strong></span>
            <span className="text-foreground/80">Soft Binding: <strong>₹30</strong></span>
            <span className="text-foreground/80">Spiral Binding: <strong>₹50</strong></span>
          </div>
        </div>

        {/* Combined amount breakdown + submit — shown above payment */}
        {entries.length > 0 && (
          <div className="bg-primary/5 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Amount Breakdown</p>
            <div className="space-y-1 text-sm">
              {entries.map((entry, i) => {
                const { amount } = getEntryCosts(entry);
                return (
                  <div key={entry.id} className="flex justify-between text-foreground/80">
                    <span className="truncate max-w-[200px]">
                      {entries.length > 1 ? `File ${i + 1}: ` : ""}{entry.file.name}
                    </span>
                    <span className="font-medium text-foreground flex-shrink-0 ml-2">₹{amount}</span>
                  </div>
                );
              })}
              <div className="flex justify-between border-t border-primary/20 pt-2 mt-1">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary leading-none">₹{totalAmount}</span>
              </div>
              {isResubmitMode && (
                <>
                  <div className="flex justify-between text-emerald-700 border-t border-emerald-200 pt-2 mt-1">
                    <span className="font-semibold">Previously Paid</span>
                    <span className="font-bold">₹{alreadyPaid}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span className="font-semibold">Amount to Pay Now</span>
                    <span className={cn("font-bold", additionalAmount > 0 ? "text-orange-700" : "text-emerald-700")}>
                      {additionalAmount > 0 ? `₹${additionalAmount}` : "₹0"}
                    </span>
                  </div>
                </>
              )}
            </div>

            <Button
              className={cn(
                "w-full gap-2 mt-1 h-11 text-sm font-semibold",
                isResubmitMode && additionalAmount > 0
                  ? "bg-orange-600 hover:bg-orange-700 text-white"
                  : isResubmitMode
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              )}
              disabled={!entries.length || !hasRealFileInResubmit}
              onClick={handleSubmit}
            >
              <Printer className="w-4 h-4" />
              {isResubmitMode
                ? additionalAmount > 0
                  ? `Pay ₹${additionalAmount} and Resubmit`
                  : "Resubmit - No additional payment"
                : `Proceed to Pay — ₹${totalAmount}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------- Status Badge ----------

const StatusBadge = ({ status }: { status: JobStatus }) => {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border",
        cfg.color
      )}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// ---------- Main Component ----------

const PrintDashboard = () => {
  const { user, isAdmin } = useAuth();
  const admin = isAdmin();

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingJobs, setPendingJobs] = useState<PrintJob[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showResubmitPayment, setShowResubmitPayment] = useState(false);
  const [resubmitPanelOpen, setResubmitPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "completed">("all");
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);
  const [resubmitJob, setResubmitJob] = useState<PrintJob | null>(null);
  const [pendingResubmit, setPendingResubmit] = useState<{
    jobData: Omit<PrintJob, "id" | "queueNo" | "status" | "submittedAt">;
    fileUrl?: string;
    carriedAmount: number;
    recalculatedSubtotal: number;
    additionalRequired: number;
    totalPaid: number;
    sourceJobId: string;
    sourceJobCode?: string;
    sourceOriginalJobCode?: string;
  } | null>(null);
  const userName = user?.name ?? (admin ? "Admin Officer" : "Student");
  const rollNo = "—";

  const tryInsertPrintJob = async (payload: Record<string, unknown>) => {
    const currentPayload: Record<string, unknown> = { ...payload };
    let lastResult:
      | { data: Record<string, unknown> | null; error: { message?: string } | null }
      | undefined;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await supabase
        .from("print_jobs")
        .insert(currentPayload)
        .select()
        .single();

      lastResult = result;

      if (!result.error) {
        return result;
      }

      const missingColumnMatch = result.error.message?.match(/Could not find the '([^']+)' column/);
      if (!missingColumnMatch) {
        return result;
      }

      const missingColumn = missingColumnMatch[1];
      if (!(missingColumn in currentPayload)) {
        return result;
      }

      delete currentPayload[missingColumn];
    }

    return (
      lastResult ?? {
        data: null,
        error: { message: "Insert failed after schema compatibility retries." },
      }
    );
  };

  const tryCloseOriginalJobAsResubmitted = async (
    sourceJobId: string,
    nowIso: string,
    newJobId: string
  ) => {
    const updatePayload: Record<string, unknown> = {
      can_resubmit: false,
      resubmitted_at: nowIso,
      resubmitted_as: newJobId,
    };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await supabase
        .from("print_jobs")
        .update(updatePayload)
        .eq("id", sourceJobId);

      if (!result.error) {
        return;
      }

      const missingColumnMatch = result.error.message?.match(/Could not find the '([^']+)' column/);
      if (!missingColumnMatch) {
        return;
      }

      const missingColumn = missingColumnMatch[1];
      if (!(missingColumn in updatePayload)) {
        return;
      }

      delete updatePayload[missingColumn];
    }
  };

  const completeResubmitInsert = async (
    payload: {
      jobData: Omit<PrintJob, "id" | "queueNo" | "status" | "submittedAt">;
      fileUrl?: string;
      carriedAmount: number;
      recalculatedSubtotal: number;
      additionalRequired: number;
      totalPaid: number;
      sourceJobId: string;
      sourceJobCode?: string;
      sourceOriginalJobCode?: string;
    },
    paymentId: string | undefined
  ) => {
    const nextQueueNo = jobs.reduce((max, current) => Math.max(max, current.queueNo), 0) + 1;
    const nowIso = new Date().toISOString();

    const { data: generatedCode, error: codeError } = await supabase.rpc("next_print_job_code");
    let newJobCode = typeof generatedCode === "string" ? generatedCode : undefined;
    if (!newJobCode || codeError) {
      newJobCode = await buildFallbackPrintJobCode();
    }

    const baseInsertPayload = {
      queue_no: nextQueueNo,
      submitted_by: payload.jobData.submittedBy,
      roll_no: payload.jobData.rollNo,
      file_name: payload.jobData.fileName,
      pages: payload.jobData.pages,
      copies: payload.jobData.copies,
      color: payload.jobData.color,
      side: payload.jobData.side,
      orientation: payload.jobData.orientation,
      binding: payload.jobData.binding,
      print_cost: payload.jobData.printCost,
      binding_cost: payload.jobData.bindingCost,
      amount: payload.recalculatedSubtotal,
      carried_amount: payload.carriedAmount,
      amount_paid: payload.totalPaid,
      additional_paid: payload.additionalRequired,
      status: "queued" as const,
      payment_id: paymentId,
      student_email: user?.email,
      file_url: payload.fileUrl,
      job_code: newJobCode,
      original_job_code: payload.sourceOriginalJobCode ?? payload.sourceJobCode,
      original_job_id: payload.sourceJobId,
    };

    const insertResult = await tryInsertPrintJob(baseInsertPayload as unknown as Record<string, unknown>);

    if (insertResult.error || !insertResult.data) {
      alert(`Failed to create resubmitted job: ${insertResult.error?.message ?? "Unknown error"}`);
      return;
    }

    await tryCloseOriginalJobAsResubmitted(payload.sourceJobId, nowIso, String(insertResult.data.id));

    const newJob = dbToJob(insertResult.data);
    setJobs((prev) =>
      [...prev.map((job) => (job.id === payload.sourceJobId ? { ...job, canResubmit: false, resubmittedAt: nowIso, resubmittedAs: insertResult.data.id } : job)), newJob]
        .sort((a, b) => a.queueNo - b.queueNo)
    );
    setResubmitPanelOpen(false);
    setResubmitJob(null);
  };

  const handleResubmitPaymentConfirm = async () => {
    if (!pendingResubmit) return;
    const paymentId = `pay_${Math.random().toString(36).slice(2, 10)}`;
    await completeResubmitInsert(pendingResubmit, paymentId);
    setShowResubmitPayment(false);
    setPendingResubmit(null);
  };

  useEffect(() => {
    const fetchJobs = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      const { data, error } = await supabase
        .from("print_jobs")
        .select("*")
        .order("queue_no", { ascending: true });
      if (!error && data) setJobs(data.map(dbToJob));
      if (isInitial) setLoading(false);
    };
    fetchJobs(true);

    const channel = supabase
      .channel("print_jobs_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => {
        fetchJobs(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Stats — scoped to current user's jobs only
  const myJobs = jobs.filter((j) => j.submittedBy === userName);
  const myActiveJob = myJobs
    .filter((j) => j.status === "queued" || j.status === "printing")
    .sort((a, b) => a.queueNo - b.queueNo)[0];
  const queuedCount = myActiveJob
    ? jobs.filter(
        (j) => (j.status === "queued" || j.status === "printing") && j.queueNo < myActiveJob.queueNo
      ).length
    : 0;
  const totalInQueue = jobs.filter((j) => j.status === "queued" || j.status === "printing").length;
  const totalRevenue = myJobs
    .filter((j) => j.status !== "pending_payment" && j.status !== "cancelled")
    .reduce((s, j) => s + j.amount, 0);
  const completedCount = myJobs.filter((j) => j.status === "completed").length;
  const totalPages = myJobs
    .filter((j) => j.status !== "pending_payment" && j.status !== "cancelled")
    .reduce((s, j) => s + j.pages * j.copies, 0);

  // each user sees only their own jobs (including cancelled to see rejection reasons)
  const visibleJobs = myJobs
    .filter((j) => j.status !== "pending_payment")
    .filter((j) => statusFilter === "all" || j.status === statusFilter)
    .sort((a, b) => a.queueNo - b.queueNo);

  const handleUploadSubmit = async (
    items: Array<{ job: Omit<PrintJob, "id" | "queueNo" | "status" | "submittedAt">; file: File }>
  ) => {
    if (resubmitJob) {
      const item = items[0];
      if (!item) return;

      const nextQueueNo = jobs.reduce((max, current) => Math.max(max, current.queueNo), 0) + 1;
      const safeFileName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}_resubmit_${safeFileName}`;
      let fileUrl: string | undefined;

      const { error: uploadError } = await supabase.storage
        .from("print-files")
        .upload(filePath, item.file);

      if (uploadError) {
        console.error("Resubmission file upload error:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from("print-files")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      const carriedAmount = resubmitJob.heldAmount ?? resubmitJob.amount;
      const recalculatedSubtotal = item.job.amount;
      const additionalRequired = Math.max(0, recalculatedSubtotal - carriedAmount);
      const totalPaid = carriedAmount + additionalRequired;
      const payload = {
        jobData: item.job,
        fileUrl,
        carriedAmount,
        recalculatedSubtotal,
        additionalRequired,
        totalPaid,
        sourceJobId: resubmitJob.id,
        sourceJobCode: resubmitJob.jobCode,
        sourceOriginalJobCode: resubmitJob.originalJobCode,
      };

      if (additionalRequired > 0) {
        setPendingResubmit(payload);
        setShowResubmitPayment(true);
        return;
      }

      await completeResubmitInsert(payload, resubmitJob.paymentId);

      return;
    }

    // Parallelize file uploads and database inserts for faster processing
    const uploadPromises = items.map(async ({ job: jobData, file }, index) => {
      // Upload file to Supabase storage
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${Date.now()}_${index}_${safeFileName}`;
      let fileUrl: string | undefined;
      const { error: uploadError } = await supabase.storage
        .from("print-files")
        .upload(filePath, file);
      if (uploadError) {
        console.error("File upload error:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from("print-files")
          .getPublicUrl(filePath);
        fileUrl = urlData.publicUrl;
      }

      const queueNo = jobs.length + index + 1;
      const baseInsertPayload = {
        queue_no: queueNo,
        submitted_by: jobData.submittedBy,
        roll_no: jobData.rollNo,
        file_name: jobData.fileName,
        pages: jobData.pages,
        copies: jobData.copies,
        color: jobData.color,
        side: jobData.side,
        orientation: jobData.orientation,
        binding: jobData.binding,
        print_cost: jobData.printCost,
        binding_cost: jobData.bindingCost,
        amount: jobData.amount,
        status: "pending_payment" as const,
        file_url: fileUrl,
        student_email: user?.email,
      };

      let result = await supabase
        .from("print_jobs")
        .insert({
          ...baseInsertPayload,
          held_amount: jobData.amount,
        })
        .select()
        .single();

      // Backward-compatible fallback when migration for held_amount is not applied yet.
      if (result.error && result.error.message?.includes("held_amount")) {
        result = await supabase
          .from("print_jobs")
          .insert(baseInsertPayload)
          .select()
          .single();
      }

      if (result.error) {
        console.error("Failed to create print job:", result.error.message);
        return { job: null, error: result.error.message };
      }

      return { job: result.data ? dbToJob(result.data) : null, error: null };
    });

    // Wait for all uploads to complete in parallel
    const results = await Promise.all(uploadPromises);
    const newJobs = results
      .map((result) => result.job)
      .filter((job): job is PrintJob => job !== null);
    const failedCount = results.filter((result) => result.error).length;

    if (newJobs.length) {
      setJobs((prev) => [...prev, ...newJobs]);
      setPendingJobs(newJobs);
      setShowPayment(true);
    }

    if (failedCount > 0) {
      alert(
        `${failedCount} file${failedCount > 1 ? "s were" : " was"} not added to payment due to a database issue. Please run the latest print_jobs migration and try again.`
      );
    }
  };

  const handlePaymentConfirm = async (jobIds: string[]) => {
    const paymentId = `pay_${Math.random().toString(36).slice(2, 10)}`;

    const rpcResult = await supabase.rpc("confirm_print_payment", {
      p_job_ids: jobIds,
      p_payment_id: paymentId,
    });

    if (!rpcResult.error && Array.isArray(rpcResult.data)) {
      const codeById = new Map<string, string>();
      rpcResult.data.forEach((row) => {
        if (row?.id && row?.job_code) {
          codeById.set(String(row.id), String(row.job_code));
        }
      });

      setJobs((prev) =>
        prev.map((j) =>
          jobIds.includes(j.id)
            ? { ...j, status: "queued", paymentId, jobCode: codeById.get(j.id) ?? j.jobCode }
            : j
        )
      );
    } else {
      // Fallback for environments where the RPC migration is not applied yet.
      const { error } = await supabase
        .from("print_jobs")
        .update({ status: "queued", payment_id: paymentId })
        .in("id", jobIds);

      if (!error) {
        setJobs((prev) =>
          prev.map((j) =>
            jobIds.includes(j.id) ? { ...j, status: "queued", paymentId } : j
          )
        );
      }
    }
    
    setShowPayment(false);
    setPendingJobs([]);
  };

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    let { error } = await supabase
      .from("print_jobs")
      .update({ status: newStatus, ...(newStatus === "printing" && { is_priority: true }) })
      .eq("id", jobId);

    // Support older schemas where is_priority column is not present.
    if (error && newStatus === "printing" && error.message?.includes("is_priority")) {
      const fallback = await supabase
        .from("print_jobs")
        .update({ status: newStatus })
        .eq("id", jobId);
      error = fallback.error;
    }

    if (!error) {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading print jobs...</span>
        </div>
      )}
      {!loading && (<>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-header mb-1">
            {admin ? "Print Queue Management" : "Print Services"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {admin
              ? "Manage all student print jobs in FIFO order"
              : "Submit your PDF and pay to get it printed"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-medium px-3 py-2 rounded-lg">
          <ListOrdered className="w-4 h-4" />
          FIFO Queue Active
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{admin ? "Total in Queue" : "Ahead of You"}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{admin ? totalInQueue : queuedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{admin ? "active print jobs" : "in queue before you"}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">My Total Spent</p>
                <p className="text-2xl font-bold text-foreground mt-1">₹{totalRevenue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">paid jobs only</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground mt-1">{completedCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">jobs done</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold text-foreground mt-1">{totalPages}</p>
                <p className="text-xs text-muted-foreground mt-0.5">pages printed</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Upload form — 2 cols on xl */}
        <div className="xl:col-span-2">
          <UploadForm
            onSubmit={handleUploadSubmit}
            submitterName={userName}
            rollNo={rollNo}
            resubmitJob={null}
            resubmitCreditAmount={0}
          />
        </div>

        {/* Queue table — 3 cols on xl */}
        <div className="xl:col-span-3 space-y-4">
          <Card className="border-none shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Printer className="w-5 h-5 text-primary" />
                  {admin ? "All Print Jobs" : "My Print Jobs"}
                </CardTitle>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {visibleJobs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground space-y-2">
                  <Printer className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm">No print jobs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10">#</TableHead>
                        {admin && <TableHead>Student</TableHead>}
                        <TableHead>File</TableHead>
                        <TableHead className="hidden md:table-cell">Options</TableHead>
                        <TableHead className="hidden sm:table-cell">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {admin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleJobs.map((job) => {
                        const eligibleResubmit =
                          !admin &&
                          (job.status === "cancelled" || job.status === "rejected") &&
                          !job.resubmittedAt &&
                          !job.resubmittedAs;
                        const resubmittedCode = job.resubmittedAs
                          ? jobs.find((candidate) => candidate.id === job.resubmittedAs)?.jobCode
                          : undefined;

                        return (
                        <TableRow
                          key={job.id}
                          className={cn("hover:bg-muted/20", eligibleResubmit && "cursor-pointer")}
                          onClick={() => {
                            if (eligibleResubmit) {
                              setResubmitJob(job);
                              setResubmitPanelOpen(true);
                            }
                          }}
                        >
                          <TableCell>
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {job.queueNo}
                            </span>
                          </TableCell>
                          {admin && (
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{job.submittedBy}</p>
                                <p className="text-xs text-muted-foreground">{job.rollNo}</p>
                              </div>
                            </TableCell>
                          )}
                          <TableCell>
                            <div>
                              {job.fileUrl ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewJob(job);
                                  }}
                                  className="font-medium text-sm text-primary hover:underline cursor-pointer flex items-center gap-1.5 text-left max-w-[160px]"
                                >
                                  <FileTypeBadge fileName={job.fileName} />
                                  <span className="truncate">{job.fileName}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 max-w-[160px]">
                                  <FileTypeBadge fileName={job.fileName} />
                                  <span className="font-medium text-sm truncate">{job.fileName}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(job.submittedAt)} · {formatTime(job.submittedAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>{job.pages}pg × {job.copies} copies</p>
                              <p>{job.color === "bw" ? "B&W" : "Color"} · {job.side === "single" ? "Single" : "Double"} · {job.orientation === "portrait" ? "Portrait" : "Landscape"}</p>
                              <p>{BINDING_LABELS[job.binding]}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="font-semibold text-primary">₹{job.amount}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <StatusBadge status={job.status} />
                              {(job.status === "cancelled" || job.status === "rejected") && !job.resubmittedAt && !job.resubmittedAs && (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setResubmitJob(job);
                                    setResubmitPanelOpen(true);
                                  }}
                                >
                                  Resubmit
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {admin && (
                            <TableCell className="text-right">
                              {job.status === "queued" ? (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                  onClick={() => handleStatusChange(job.id, "printing")}
                                >
                                  <Printer className="w-3 h-3" />
                                  Request
                                </Button>
                              ) : job.status === "printing" ? (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Request Sent
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* FIFO info callout */}
          <Card className="border-none shadow-card bg-gradient-to-r from-primary/5 to-blue-50">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ListOrdered className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">First Come, First Served</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Print jobs are processed in the order they are submitted and paid. Your queue
                  number is assigned at payment confirmation and cannot be changed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment modal */}
      <PaymentModal
        open={showPayment}
        jobs={pendingJobs}
        onConfirm={handlePaymentConfirm}
        onClose={() => {
          setShowPayment(false);
          setPendingJobs([]);
        }}
      />

      <ResubmitPaymentModal
        open={showResubmitPayment && !!pendingResubmit}
        additionalAmount={pendingResubmit?.additionalRequired ?? 0}
        fileName={pendingResubmit?.jobData.fileName ?? "Resubmitted file"}
        onConfirm={handleResubmitPaymentConfirm}
        onClose={() => {
          setShowResubmitPayment(false);
          setPendingResubmit(null);
        }}
      />

      {/* Resubmit bottom sheet */}
      <Dialog
        open={resubmitPanelOpen && !!resubmitJob}
        onOpenChange={(open) => {
          setResubmitPanelOpen(open);
          if (!open) setResubmitJob(null);
        }}
      >
        <DialogContent className="w-[92vw] max-w-xl h-[74vh] max-h-[74vh] overflow-hidden sm:rounded-2xl p-3">
          <DialogHeader>
            <DialogTitle className="text-base">Fix and Resubmit</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full">
            {resubmitJob && (
              <UploadForm
                onSubmit={handleUploadSubmit}
                submitterName={userName}
                rollNo={rollNo}
                resubmitJob={resubmitJob}
                resubmitCreditAmount={resubmitJob.heldAmount ?? resubmitJob.amount}
                resubmitReason={resubmitJob.rejectionReason}
                onCancelResubmit={() => {
                  setResubmitPanelOpen(false);
                  setResubmitJob(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview modal */}
      <Dialog open={!!previewJob} onOpenChange={() => setPreviewJob(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold truncate">
              <FileText className="w-4 h-4 text-primary flex-shrink-0" />
              {previewJob?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewJob?.fileUrl && (
              <iframe
                src={previewJob.fileUrl}
                className="w-full h-full border-0"
                title={previewJob.fileName}
                loading="lazy"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </>)}
    </div>
  );
};

export default PrintDashboard;
