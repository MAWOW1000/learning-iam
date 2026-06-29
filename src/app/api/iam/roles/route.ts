import {
  AttachRolePolicyCommand,
  CreateRoleCommand,
  CreatePolicyCommand,
} from "@aws-sdk/client-iam";
import { NextResponse } from "next/server";

import { ACCOUNT_ID } from "@/lib/iam-practice";
import { iam } from "@/lib/aws";

type CreateRoleBody = {
  roleName?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateRoleBody;
    const roleName =
      typeof body.roleName === "string" && body.roleName.trim()
        ? body.roleName.trim()
        : "PracticeS3ReadRole";

    const assumeRolePolicy = JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: `arn:aws:iam::${ACCOUNT_ID}:root` },
          Action: "sts:AssumeRole",
        },
      ],
    });

    await iam
      .send(
        new CreateRoleCommand({
          RoleName: roleName,
          AssumeRolePolicyDocument: assumeRolePolicy,
        }),
      )
      .catch(() => {
        return undefined;
      });

    const policyName = `${roleName}Policy`;

    await iam
      .send(
        new CreatePolicyCommand({
          PolicyName: policyName,
          PolicyDocument: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: ["s3:ListAllMyBuckets", "s3:ListBucket", "s3:GetObject"],
                Resource: ["arn:aws:s3:::*", "arn:aws:s3:::*/*"],
              },
            ],
          }),
        }),
      )
      .catch(() => {
        return undefined;
      });

    const policyArn = `arn:aws:iam::${ACCOUNT_ID}:policy/${policyName}`;

    await iam.send(
      new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: policyArn,
      }),
    );

    return NextResponse.json({ ok: true, roleName, policyArn });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not create role.",
      },
      { status: 500 },
    );
  }
}
