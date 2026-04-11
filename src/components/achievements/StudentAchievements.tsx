import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, GraduationCap, Calendar, Award } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Achievement {
  id: string;
  event_name: string;
  description: string;
  date_of_participation: string;
  achievement_type: string;
  certificate_url: string;
}

export default function StudentAchievements({ studentId }: { studentId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("achievements")
          .select("*")
          .eq("student_id", studentId)
          .order("date_of_participation", { ascending: false });

        if (error) throw error;
        setAchievements(data || []);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAchievements();
  }, [studentId]);

  const getCertificateUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from("achievement-certificates")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-[250px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <Award className="h-16 w-16 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold">No achievements yet</h3>
          <p className="text-muted-foreground">Your achievements and certificates will appear here once added by faculty.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {achievements.map((achievement) => {
        const certUrl = getCertificateUrl(achievement.certificate_url);
        
        return (
          <Card key={achievement.id} className="overflow-hidden bg-card hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2">{achievement.event_name}</CardTitle>
                <Badge variant="secondary" className="ml-2 whitespace-nowrap bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                  {achievement.achievement_type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center text-sm text-muted-foreground font-medium">
                <Calendar className="mr-2 h-4 w-4" />
                {format(new Date(achievement.date_of_participation), "MMMM d, yyyy")}
              </div>
              
              {achievement.description && (
                <div className="text-sm mt-3 border-t pt-3">
                  <p className="text-muted-foreground line-clamp-3">{achievement.description}</p>
                </div>
              )}
            </CardContent>
            {certUrl && (
              <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={certUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View
                  </a>
                </Button>
                <Button variant="default" size="sm" className="w-full" asChild>
                  <a href={certUrl} download>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </Button>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}
