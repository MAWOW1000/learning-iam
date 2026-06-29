import { IAMClient } from "@aws-sdk/client-iam";
import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";
import { STSClient } from "@aws-sdk/client-sts";

const region = process.env.AWS_REGION ?? "us-east-1";
const endpoint = process.env.AWS_ENDPOINT;

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
};

const baseConfig = {
  region,
  endpoint,
  credentials,
};

const s3Config: S3ClientConfig = {
  ...baseConfig,
  forcePathStyle: true, // REQUIRED for S3 on LocalStack
};

export const s3 = new S3Client(s3Config);
export const iam = new IAMClient(baseConfig);
export const sts = new STSClient(baseConfig);
