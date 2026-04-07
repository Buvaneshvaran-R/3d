import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  Download,
  ListOrdered,
  Mail,
  XCircle,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Types ----------

type PrintColor = "bw" | "color";
type PrintSide = "single" | "double";
type PrintBinding = "none" | "soft" | "spiral";
type PrintOrientation = "portrait" | "landscape";

interface PrintJob {
  id: string;
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
  amount: number;
  status: string;
  submittedAt: string;
  completedAt?: string;
  fileUrl?: string;
  studentEmail?: string;
  isPriority?: boolean;
}

// ---------- Helpers ----------

const BINDING_LABELS: Record<PrintBinding, string> = {
  none: "No Binding",
  soft: "Soft Binding",
  spiral: "Spiral Binding",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToJob(row: { [key: string]: any }): PrintJob {
  return {
    id: row.id,
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
    amount: row.amount,
    status: row.status,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at ?? undefined,
    fileUrl: row.file_url ?? undefined,
    studentEmail: row.student_email ?? undefined,
    isPriority: row.is_priority ?? false,
  };
}

function getFileTypeMeta(fileName: string): { label: string; bg: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")                                        return { label: "PDF", bg: "bg-red-600" };
  if (["doc", "docx"].includes(ext))                       return { label: "DOC", bg: "bg-blue-600" };
  if (["xls", "xlsx"].includes(ext))                       return { label: "XLS", bg: "bg-green-600" };
  if (["ppt", "pptx"].includes(ext))                       return { label: "PPT", bg: "bg-orange-500" };
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return { label: ext.toUpperCase(), bg: "bg-purple-500" };
  return { label: ext.toUpperCase() || "FILE",             bg: "bg-gray-400" };
}

const FileTypeBadge = ({ fileName }: { fileName: string }) => {
  const { label, bg } = getFileTypeMeta(fileName);
  return (
    <span className={cn("inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white flex-shrink-0", bg)}>
      {label}
    </span>
  );
};

// ---------- Waiting Time ----------

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

// ---------- Beep Alert ----------

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

// ---------- Job Detail Dialog ----------

const JobDetailDialog = ({
  job,
  open,
  onClose,
  onDownloaded,
  onReject,
  isFirstInQueue,
  firstJobQueueNo,
}: {
  job: PrintJob | null;
  open: boolean;
  onClose: () => void;
  onDownloaded: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isFirstInQueue: boolean;
  firstJobQueueNo: number;
}) => {
  const [downloading, setDownloading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!job) return null;

  const handleDownload = async () => {
    if (!job.fileUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(job.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = job.fileName;
      a.click();
      URL.revokeObjectURL(url);
      onDownloaded(job.id);
    } finally {
      setDownloading(false);
    }
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onReject(job.id, rejectReason.trim());
    setRejectReason("");
    setShowReject(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">

        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              #{job.queueNo}
            </span>
            Print Job Details
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Submitted By */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Submitted By</p>
            <div className="bg-muted/40 rounded-lg px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{job.submittedBy}</p>
                {job.isPriority && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wide">
                    TEACHER
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{job.rollNo || "—"}</p>
              {job.studentEmail && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-primary">{job.studentEmail}</p>
                </div>
              )}
            </div>
          </div>

          {/* File */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">File</p>
            <div className="bg-muted/40 rounded-lg px-4 py-3 flex items-center gap-2">
              <FileTypeBadge fileName={job.fileName} />
              <span className="text-sm font-medium text-foreground break-all">{job.fileName}</span>
            </div>
          </div>

          {/* Print Instructions */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Print Instructions</p>
            <div className="bg-muted/40 rounded-lg overflow-hidden">
              {[
                { label: "Pages",       value: `${job.pages} page${job.pages !== 1 ? "s" : ""}` },
                { label: "Copies",      value: `${job.copies} ${job.copies === 1 ? "copy" : "copies"}` },
                { label: "Color",       value: job.color === "bw" ? "Black & White" : "Color" },
                { label: "Sides",       value: job.side === "single" ? "Single Side" : "Double Side" },
                { label: "Orientation", value: job.orientation === "portrait" ? "Portrait" : "Landscape" },
                { label: "Binding",     value: BINDING_LABELS[job.binding] },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Amount Paid</p>
              <p className="text-xl font-bold text-primary">₹{job.amount}</p>
            </div>
            <div className="bg-muted/40 rounded-lg px-4 py-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Submitted</p>
              <p className="text-xs font-semibold text-foreground leading-tight">
                {new Date(job.submittedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>

          {/* Reject section */}
          {job.status === "queued" && showReject && (
            <div className="space-y-2 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-red-600">Reason for rejection</p>
                <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">REQUIRED</span>
              </div>
              <Textarea
                placeholder="Please explain why this job is being rejected (e.g., File is corrupted, unsupported format, exceeds page limit, etc.)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-sm resize-none border-red-300 focus:border-red-500 focus:ring-red-500"
                rows={4}
                autoFocus
              />
              {!rejectReason.trim() && (
                <p className="text-xs text-red-600">
                  ⚠️ You must provide a reason before rejecting this job
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => {setShowReject(false); setRejectReason("");}}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!rejectReason.trim()}
                  onClick={handleRejectSubmit}
                >
                  {!rejectReason.trim() ? "Enter Reason First" : "Confirm Reject"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-5 pt-3 border-t border-border space-y-2">
          {job.fileUrl ? (
            <Button
              className="w-full gap-2 h-11 text-sm font-semibold"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? "Downloading…" : "Download File"}
            </Button>
          ) : (
            <div className="w-full h-11 flex items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm gap-2">
              <Download className="w-4 h-4" />
              No file attached
            </div>
          )}

          {job.status === "queued" && !isFirstInQueue && (
            <div className="w-full h-9 flex items-center justify-center rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Note: Job #{firstJobQueueNo} is ahead in queue
            </div>
          )}

          {job.status === "queued" && !showReject && (
            <Button
              variant="outline"
              className="w-full gap-2 h-9 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setShowReject(true)}
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject this Job
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Main Component ----------

const PrintKeeperPortal = () => {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);
  const [downloadedJobs, setDownloadedJobs] = useState<Set<string>>(new Set());
  const [newJobAlert, setNewJobAlert] = useState<"priority" | "normal" | null>(null);
  const [now, setNow] = useState(Date.now());
  const prevPendingCount = useRef(0);

  // Update "time ago" every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchJobs = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      const { data, error } = await supabase
        .from("print_jobs")
        .select("*")
        .order("queue_no", { ascending: true });
      if (!error && data) {
        const mapped = data.map(dbToJob);
        const incomingPending = mapped.filter((j) => j.status === "queued" || j.status === "printing").length;

        // New job alert
        if (!isInitial && incomingPending > prevPendingCount.current) {
          playBeep();
          const hasNewPriority = mapped.some(
            (j) => j.status === "printing" && j.isPriority &&
            !jobs.find((prev) => prev.id === j.id && prev.status === "printing")
          );
          setNewJobAlert(hasNewPriority ? "priority" : "normal");
          setTimeout(() => setNewJobAlert(null), 6000);
        }
        prevPendingCount.current = incomingPending;
        setJobs(mapped);
      }
      if (isInitial) setLoading(false);
    };
    fetchJobs(true);

    const channel = supabase
      .channel("print_keeper_jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "print_jobs" }, () => {
        fetchJobs(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const pendingJobs = jobs
    .filter((j) => j.status === "queued" || j.status === "printing")
    .sort((a, b) => {
      // Priority (printing) jobs first, then FIFO
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      return a.queueNo - b.queueNo;
    });

  const completedJobs = jobs
    .filter((j) => {
      if (j.status !== "completed") return false;
      
      // Hide completed jobs older than 24 hours
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const completedTime = new Date(j.completedAt || j.submittedAt).getTime();
      
      return completedTime > twentyFourHoursAgo;
    })
    .sort((a, b) => b.queueNo - a.queueNo);

  const totalPagesHandled = completedJobs.reduce((s, j) => s + j.pages * j.copies, 0);

  const handleMarkDone = async (jobId: string) => {
    try {
      const now = new Date().toISOString();
      console.log('Marking job as done:', jobId, 'at', now);
      
      // First try with completed_at column (if migration was run)
      let { data, error } = await supabase
        .from("print_jobs")
        .update({ status: "completed", completed_at: now })
        .eq("id", jobId)
        .select();
      
      // If error mentions "completed_at" column doesn't exist, try without it
      if (error && error.message?.includes('completed_at')) {
        console.warn('completed_at column not found, updating without it. Run migration: supabase/22_print_jobs_completed_at.sql');
        const fallback = await supabase
          .from("print_jobs")
          .update({ status: "completed" })
          .eq("id", jobId)
          .select();
        data = fallback.data;
        error = fallback.error;
      }
      
      if (error) {
        console.error('Failed to mark job as done:', error);
        alert(`Failed to update job: ${error.message}\n\nPossible causes:\n- RLS policies blocking updates\n- Not logged in as admin\n- Network issue\n\nCheck browser console for details.`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.error('No data returned after update, job may not exist:', jobId);
        alert('Job update returned no data. The job may have been deleted.');
        return;
      }
      
      console.log('Job marked as done successfully:', data);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "completed", completedAt: now } : j));
      setDownloadedJobs((prev) => { const s = new Set(prev); s.delete(jobId); return s; });
    } catch (err) {
      console.error('Exception while marking job as done:', err);
      alert('An error occurred while updating the job. Check the console for details.');
    }
  };

  const handleReject = async (jobId: string, reason: string) => {
    try {
      console.log('Rejecting job:', jobId, 'with reason:', reason);
      const { data, error } = await supabase
        .from("print_jobs")
        .update({ status: "cancelled", rejection_reason: reason })
        .eq("id", jobId)
        .select();
      
      if (error) {
        console.error('Failed to reject job:', error);
        alert(`Failed to reject job: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.error('No data returned after reject update');
        alert('Job reject returned no data.');
        return;
      }
      
      console.log('Job rejected successfully:', data);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: "cancelled" } : j));
    } catch (err) {
      console.error('Exception while rejecting job:', err);
      alert('An error occurred while rejecting the job.');
    }
  };

  const handleDownloaded = (jobId: string) => {
    setDownloadedJobs((prev) => new Set(prev).add(jobId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading jobs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">

      <JobDetailDialog
        job={selectedJob}
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onDownloaded={handleDownloaded}
        onReject={handleReject}
        isFirstInQueue={pendingJobs[0]?.id === selectedJob?.id}
        firstJobQueueNo={pendingJobs[0]?.queueNo ?? 0}
      />

      {/* New job alert banner */}
      {newJobAlert && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-fade-in text-white",
          newJobAlert === "priority" ? "bg-red-500" : "bg-orange-500"
        )}>
          <BellRing className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <p className="text-sm font-semibold">
            {newJobAlert === "priority"
              ? "⚡ Priority request from a teacher — print immediately!"
              : "New print job received!"}
          </p>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Print Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Click a job to view details and download the file
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary font-medium px-3 py-2 rounded-lg">
          <ListOrdered className="w-4 h-4" />
          FIFO Queue Active
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Jobs</p>
                <p className="text-3xl font-bold text-foreground mt-1">{pendingJobs.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">waiting to print</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground mt-1">{completedJobs.length}</p>
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
                <p className="text-3xl font-bold text-foreground mt-1">{totalPagesHandled}</p>
                <p className="text-xs text-muted-foreground mt-0.5">pages printed</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incoming Jobs Queue */}
      <Card className="border-none shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="w-5 h-5 text-primary" />
            Incoming Jobs
            {pendingJobs.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                {pendingJobs.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingJobs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-300" />
              <p className="text-sm font-medium">All clear! No pending jobs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead>Waiting</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className={cn(
                        "cursor-pointer",
                        job.isPriority
                          ? "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500"
                          : "hover:bg-muted/30"
                      )}
                      onClick={() => setSelectedJob(job)}
                    >
                      <TableCell>
                        <span className={cn(
                          "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center",
                          job.isPriority ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                          {job.queueNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {job.isPriority && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wide">
                              TEACHER
                            </span>
                          )}
                          <p className="font-medium text-sm">{job.submittedBy}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{job.rollNo}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 max-w-[160px]">
                          <FileTypeBadge fileName={job.fileName} />
                          <span className="font-medium text-sm truncate">{job.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{job.pages}pg × {job.copies} {job.copies === 1 ? "copy" : "copies"}</p>
                          <p>{job.color === "bw" ? "B&W" : "Color"} · {job.side === "single" ? "Single" : "Double"} side</p>
                          <p>{BINDING_LABELS[job.binding]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* force re-render every 30s via `now` */}
                        <span key={now} className="text-xs text-orange-500 font-medium whitespace-nowrap">
                          {timeAgo(job.submittedAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">₹{job.amount}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {downloadedJobs.has(job.id) && (
                          <Button
                            size="sm"
                            className="h-7 text-xs px-3 gap-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleMarkDone(job.id)}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark Done
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <Card className="border-none shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Completed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Settings</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="hover:bg-muted/20 opacity-60 cursor-pointer"
                      onClick={() => setSelectedJob(job)}
                    >
                      <TableCell>
                        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                          {job.queueNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {job.isPriority && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wide">
                              TEACHER
                            </span>
                          )}
                          <p className="font-medium text-sm">{job.submittedBy}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{job.rollNo}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 max-w-[160px]">
                          <FileTypeBadge fileName={job.fileName} />
                          <span className="text-sm truncate">{job.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{job.pages}pg × {job.copies} {job.copies === 1 ? "copy" : "copies"}</p>
                          <p>{job.color === "bw" ? "B&W" : "Color"} · {job.side === "single" ? "Single" : "Double"} side</p>
                          <p>{BINDING_LABELS[job.binding]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">₹{job.amount}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrintKeeperPortal;
