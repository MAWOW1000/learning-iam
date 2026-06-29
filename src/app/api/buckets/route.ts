import { CreateBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { s3 } from "@/lib/aws";

type CreateBucketBody = {
  name?: unknown;
};

export async function GET() {
  const out = await s3.send(new ListBucketsCommand({}));

  return NextResponse.json(out.Buckets ?? []);
}

export async function POST(req: Request) {
  const body = (await req.json()) as CreateBucketBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { error: "Bucket name is required" },
      { status: 400 },
    );
  }

  await s3.send(new CreateBucketCommand({ Bucket: name }));

  return NextResponse.json({ ok: true, name });
}
