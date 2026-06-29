import { NextResponse } from "next/server";

import {
  addUserToSingleGroup,
  deleteUserAndMemberships,
  listUsersWithGroups,
  TIER_NAMES,
  type TierName,
} from "@/lib/iam-practice";

type CreateUserBody = {
  name?: unknown;
  group?: unknown;
};

type DeleteUserBody = {
  name?: unknown;
};

export async function GET() {
  try {
    const users = await listUsersWithGroups();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not list users.",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateUserBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const group = typeof body.group === "string" ? body.group.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "User name is required." }, { status: 400 });
    }

    if (!TIER_NAMES.includes(group as TierName)) {
      return NextResponse.json({ error: "Invalid group name." }, { status: 400 });
    }

    await addUserToSingleGroup(name, group as TierName);

    return NextResponse.json({ ok: true, name, group });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not create user.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as DeleteUserBody;
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "User name is required." }, { status: 400 });
    }

    await deleteUserAndMemberships(name);

    return NextResponse.json({ ok: true, name });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not delete user.",
      },
      { status: 500 },
    );
  }
}
