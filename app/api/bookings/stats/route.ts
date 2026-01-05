import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    // Get counts by status
    const [total, scheduled, completed, cancelled, noShow, rescheduled] = await Promise.all([
      db.booking.count({ where }),
      db.booking.count({ where: { ...where, status: 'scheduled' } }),
      db.booking.count({ where: { ...where, status: 'completed' } }),
      db.booking.count({ where: { ...where, status: 'cancelled' } }),
      db.booking.count({ where: { ...where, status: 'no_show' } }),
      db.booking.count({ where: { ...where, status: 'rescheduled' } }),
    ]);

    // Calculate rates
    const completedMeetings = completed + noShow + cancelled;
    const completionRate = completedMeetings > 0 ? (completed / completedMeetings) * 100 : 0;
    const noShowRate = completedMeetings > 0 ? (noShow / completedMeetings) * 100 : 0;
    const cancellationRate = completedMeetings > 0 ? (cancelled / completedMeetings) * 100 : 0;

    // Get upcoming meetings count (scheduled meetings in the future)
    const upcoming = await db.booking.count({
      where: {
        ...where,
        status: 'scheduled',
        scheduledAt: {
          gte: new Date(),
        },
      },
    });

    // Get meetings by type
    const byMeetingType = await db.booking.groupBy({
      by: ['meetingTypeId'],
      where,
      _count: true,
    });

    // Get meeting type details
    const meetingTypes = await db.meetingType.findMany({
      where: {
        id: { in: byMeetingType.filter(b => b.meetingTypeId).map(b => b.meetingTypeId!) },
      },
    });

    const byTypeWithNames = byMeetingType.map((item) => ({
      meetingTypeId: item.meetingTypeId,
      meetingTypeName: meetingTypes.find((t) => t.id === item.meetingTypeId)?.name || 'No Type',
      count: item._count,
    }));

    // Get meetings by user
    const byUser = await db.booking.groupBy({
      by: ['userId'],
      where,
      _count: true,
    });

    const users = await db.user.findMany({
      where: {
        id: { in: byUser.map(b => b.userId) },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    const byUserWithNames = byUser.map((item) => {
      const user = users.find((u) => u.id === item.userId);
      return {
        userId: item.userId,
        userName: user?.name || 'Unknown',
        userAvatar: user?.avatar,
        count: item._count,
      };
    });

    // Get outcomes distribution
    const byOutcome = await db.booking.groupBy({
      by: ['outcomeId'],
      where: {
        ...where,
        outcomeId: { not: null },
      },
      _count: true,
    });

    const outcomes = await db.meetingOutcome.findMany({
      where: {
        id: { in: byOutcome.filter(b => b.outcomeId).map(b => b.outcomeId!) },
      },
    });

    const byOutcomeWithNames = byOutcome.map((item) => {
      const outcome = outcomes.find((o) => o.id === item.outcomeId);
      return {
        outcomeId: item.outcomeId,
        outcomeName: outcome?.name || 'Unknown',
        isPositive: outcome?.isPositive ?? false,
        count: item._count,
      };
    });

    return NextResponse.json({
      stats: {
        total,
        scheduled,
        completed,
        cancelled,
        noShow,
        rescheduled,
        upcoming,
        completionRate: Math.round(completionRate * 10) / 10,
        noShowRate: Math.round(noShowRate * 10) / 10,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
      },
      byMeetingType: byTypeWithNames,
      byUser: byUserWithNames,
      byOutcome: byOutcomeWithNames,
    });
  } catch (error) {
    console.error("Error fetching booking stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
