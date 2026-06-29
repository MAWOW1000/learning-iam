import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { AssumeRoleCommand } from "@aws-sdk/client-sts";
import { NextResponse } from "next/server";

import { ACCOUNT_ID } from "@/lib/iam-practice";
import { sts } from "@/lib/aws";

type AssumeRoleBody = {
  roleName?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AssumeRoleBody;
    const roleName =
      typeof body.roleName === "string" && body.roleName.trim()
        ? body.roleName.trim()
        : "PracticeS3ReadRole";

    const roleArn = `arn:aws:iam::${ACCOUNT_ID}:role/${roleName}`;

    const assumed = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `session-${Date.now()}`,
      }),
    );

    const credentials = assumed.Credentials;

    if (!credentials?.AccessKeyId || !credentials.SecretAccessKey || !credentials.SessionToken) {
      return NextResponse.json(
        { ok: false, error: "Role assumed but no credentials returned." },
        { status: 500 },
      );
    }

    const assumedSts = new STSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      endpoint: process.env.AWS_ENDPOINT,
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      },
    });

    const identity = await assumedSts.send(new GetCallerIdentityCommand({}));

    return NextResponse.json({
      ok: true,
      roleArn,
      assumedRoleArn: assumed.AssumedRoleUser?.Arn,
      expiresAt: credentials.Expiration,
      identity,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not assume role.",
      },
      { status: 500 },
    );
  }
}
