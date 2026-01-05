"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface MeetingStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  completionRate: number;
  noShowRate: number;
}

interface MeetingStatsCardsProps {
  stats: MeetingStats;
  loading?: boolean;
}

export function MeetingStatsCards({ stats, loading }: MeetingStatsCardsProps) {
  const cards = [
    {
      title: "Total Meetings",
      value: stats.total,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Scheduled",
      value: stats.scheduled,
      subtitle: `${stats.upcoming} upcoming`,
      icon: Calendar,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Completed",
      value: stats.completed,
      subtitle: `${stats.completionRate}% completion rate`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "No Shows",
      value: stats.noShow,
      subtitle: `${stats.noShowRate}% no-show rate`,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Cancelled",
      value: stats.cancelled,
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
