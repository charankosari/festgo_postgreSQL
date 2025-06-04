import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("./config/config.env") });

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});



export class Uploader {
  async uploadPublicFile(folderName, fileName, fileBuffer) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.S3_BUCKET,
          ACL: "public-read",
          Body: fileBuffer,
          Key: `${folderName}/${fileName}`,
        },
      });

      await upload.done();

      return `${process.env.S3_URL}/festgo/${folderName}/${fileName}`;
    } catch (err) {
      console.error("❌ Error during public file upload:", err);
      throw err;
    }
  }

  async uploadPrivateFile(folderName, fileName, fileBuffer) {
    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.S3_BUCKET,
          ACL: "private",
          Body: fileBuffer,
          Key: `${folderName}/${fileName}`,
        },
      });

      await upload.done();

      return `${folderName}/${fileName}`;
    } catch (err) {
      console.error("❌ Error during private file upload:", err);
      throw err;
    }
  }

  static async generatePresignedUrl(fileKey) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (err) {
      console.error("❌ Error generating presigned URL:", err);
      throw err;
    }
  }
}
