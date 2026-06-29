import { NextResponse } from "next/server";

import { ensureGroupWithPolicy, listGroups, TIER_NAMES } from "@/lib/iam-practice";

export async function POST() {
  try {
    await Promise.all(TIER_NAMES.map((groupName) => ensureGroupWithPolicy(groupName)));

    const groups = await listGroups();

    return NextResponse.json({ ok: true, groups });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not set up IAM practice groups.",
      },
      { status: 500 },
    );
  }
}
