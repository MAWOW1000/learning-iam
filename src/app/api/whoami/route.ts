import { GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { NextResponse } from "next/server";

import { sts } from "@/lib/aws";

export async function GET() {
  const id = await sts.send(new GetCallerIdentityCommand({}));

  return NextResponse.json(id);
}
