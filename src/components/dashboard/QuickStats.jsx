import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuickStats({ 
  totalPatients, 
  todayAppointments, 
  pendingAppointments, 
  isLoading 
}) {
  const stats = [
    {
      title: "Total Patients",
      value: totalPatients,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600"
    },
    {
      title: "RDV Aujourd'hui",
      value: todayAppointments,
      icon: Calendar,
      color: "from-green-500 to-green-600",
      textColor: "text-green-600"
    },
    {
      title: "RDV en Attente",
      value: pendingAppointments,
      icon: Clock,
      color: "from-orange-500 to-orange-600",
      textColor: "text-orange-600"
    },
    {
      title: "Cette Semaine",
      value: todayAppointments + pendingAppointments,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      textColor: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden shadow-lg border-0 bg-white/90 backdrop-blur">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${stat.color} opacity-10 translate-x-6 -translate-y-6`} />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">
                  {stat.title}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}