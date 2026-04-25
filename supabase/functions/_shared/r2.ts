import { S3Client } from "npm:@aws-sdk/client-s3@3.758.0";

const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
const endpoint = Deno.env.get("R2_ENDPOINT");

export const r2 = new S3Client({
  region: "auto",
  endpoint: endpoint || "",
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});
export const bucket = Deno.env.get("R2_BUCKET")!;

export const getBucketName = () => {
  // All broadcast assets (Tutorials & Institutional) go to the SysAdmin bucket
  return Deno.env.get("R2_SYSADMIN_BUCKET") ?? "dyci-connect-v2-sysadmin";
};

export const getObjectKey = (url: string | null) => {
  if (!url) return null;
  const bucketName = getBucketName();

  if (url.includes('pub-')) {
    // Public domain format: https://pub-dyci.r2.dev/videos/123-file.mp4
    const parts = url.split('/');
    return parts.slice(3).join('/');
  }

  if (url.includes('r2.cloudflarestorage.com/')) {
    // S3 endpoint format
    const fullPath = url.split('r2.cloudflarestorage.com/')[1].split('?')[0];
    if (fullPath.startsWith(bucketName + '/')) {
      return fullPath.substring(bucketName.length + 1);
    }
    return fullPath;
  }

  return url; // Assume it's already a key
};
