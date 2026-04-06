import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, MapPin, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const committeeMembers: Array<{
  name: string;
  role: string;
  department: string;
  email: string;
  photo: string;
}> = [];

const upcomingMeetings: Array<{
  date: string;
  time: string;
  venue: string;
  agenda: string;
}> = [];

const pastMeetings: Array<{
  date: string;
  attendees: number;
  topics: string[];
}> = [];

const ClassCommittee = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">Class Committee</h1>

      {/* Committee Members */}
      <Card className="border-none shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Committee Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {committeeMembers.map((member, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarImage src={member.photo} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{member.name}</p>
                  <p className="text-sm text-primary">{member.role}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {member.department}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingMeetings.map((meeting, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-primary/5 border border-primary/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {meeting.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {meeting.venue}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-0">Upcoming</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Agenda:</span> {meeting.agenda}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Past Meetings */}
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Past Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastMeetings.map((meeting, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-foreground">
                    {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <span className="text-sm text-muted-foreground">
                    {meeting.attendees} attendees
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meeting.topics.map((topic, tIndex) => (
                    <Badge key={tIndex} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Class Info */}
      <Card className="border-none shadow-card bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-foreground">48</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success">92%</p>
              <p className="text-sm text-muted-foreground">Avg. Attendance</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">8.9</p>
              <p className="text-sm text-muted-foreground">Avg. CGPA</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-warning">3</p>
              <p className="text-sm text-muted-foreground">Meetings This Sem</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassCommittee;
