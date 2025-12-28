import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Round robin assignment logic
async function getNextUserInGroup(groupId: string) {
  const group = await db.roundRobinGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: {
          user: {
            status: "active",
          },
        },
        include: {
          user: true,
        },
      },
    },
  });

  if (!group || group.members.length === 0) {
    throw new Error("No active members in group");
  }

  // Get assignment counts for each member
  const memberAssignments = await Promise.all(
    group.members.map(async (member) => {
      const count = await db.assignment.count({
        where: {
          userId: member.userId,
          groupId: groupId,
        },
      });
      return {
        member,
        count,
      };
    })
  );

  // Sort by assignment count (ascending) to find who has the least
  memberAssignments.sort((a, b) => {
    if (group.distributionMode === "weighted") {
      // For weighted distribution, calculate effective count
      const aEffective = a.count / a.member.weight;
      const bEffective = b.count / b.member.weight;
      return aEffective - bEffective;
    }
    // For equal distribution, just use count
    return a.count - b.count;
  });

  return memberAssignments[0].member.user;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body = await request.json();
    const { groupId, method = "manual" } = body;

    // Get the next user in the round robin
    const user = await getNextUserInGroup(groupId);

    // Create the assignment
    const assignment = await db.assignment.create({
      data: {
        contactId,
        userId: user.id,
        groupId,
        method,
      },
      include: {
        user: true,
        group: true,
        contact: true,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error routing contact:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to route contact" },
      { status: 500 }
    );
  }
}
