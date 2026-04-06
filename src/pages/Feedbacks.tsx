import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Star, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const feedbackSubjects: Array<{
  code: string;
  name: string;
  faculty: string;
  status: string;
  rating: number | null;
}> = [];

const Feedbacks = () => {
  const completedCount = feedbackSubjects.filter(s => s.status === "completed").length;
  const pendingCount = feedbackSubjects.filter(s => s.status === "pending").length;
  const progress = feedbackSubjects.length > 0 ? (completedCount / feedbackSubjects.length) * 100 : 0;
  
  const avgRating = feedbackSubjects.length > 0 
    ? feedbackSubjects
        .filter(s => s.rating !== null)
        .reduce((sum, s) => sum + (s.rating || 0), 0) / 
      feedbackSubjects.filter(s => s.rating !== null).length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Feedbacks</h1>

      {/* Progress Card */}
      <Card className="border-none shadow-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Feedback Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {completedCount} of {feedbackSubjects.length} feedbacks completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32">
                <Progress value={progress} className="h-3" />
              </div>
              <span className="text-2xl font-bold text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-success mt-2">{completedCount}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-warning mt-2">{pendingCount}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating Given</p>
                <p className="text-3xl font-bold text-primary mt-2">{avgRating > 0 ? avgRating.toFixed(1) : '—'}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star className="w-7 h-7 text-primary fill-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Subject-wise Feedback Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedbackSubjects.map((subject, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                subject.status === "completed" 
                  ? "bg-success/5 border-success/20" 
                  : "bg-muted/30 border-border"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  subject.status === "completed" ? "bg-success/10" : "bg-muted"
                }`}>
                  {subject.status === "completed" ? (
                    <CheckCircle2 className="w-6 h-6 text-success" />
                  ) : (
                    <Clock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{subject.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {subject.code} • {subject.faculty}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {subject.status === "completed" ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.floor(subject.rating!) 
                              ? "text-warning fill-warning" 
                              : star <= subject.rating! 
                                ? "text-warning fill-warning/50" 
                                : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-foreground">{subject.rating}</span>
                  </div>
                ) : (
                  <Button size="sm" className="gradient-primary text-primary-foreground">
                    Give Feedback
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deadline Notice */}
      {pendingCount > 0 && (
        <Card className="border-none shadow-card border-l-4 border-l-warning">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Feedback Deadline Approaching</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please complete all pending feedbacks before <span className="font-medium text-foreground">January 5, 2025</span>. 
                  Your feedback helps improve the quality of education.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Feedbacks;
