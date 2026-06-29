import { NextResponse } from "next/server";

import { simulateUserAction } from "@/lib/iam-practice";

type SimulateBody = {
  userName?: unknown;
  action?: unknown;
  resourceArn?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SimulateBody;

    const userName = typeof body.userName === "string" ? body.userName.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const resourceArn =
      typeof body.resourceArn === "string" ? body.resourceArn.trim() : "";

    if (!userName || !action || !resourceArn) {
      return NextResponse.json(
        { error: "userName, action and resourceArn are required." },
        { status: 400 },
      );
    }

    const result = await simulateUserAction({ userName, action, resourceArn });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not simulate principal policy decision.",
      },
      { status: 500 },
    );
  }
}
