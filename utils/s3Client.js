// utils/s3Client.js
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET = process.env.S3_BUCKET_NAME || "lawgikalai-bucket";

const s3 = new S3Client({ region: REGION });

async function uploadToS3(file, folder = "news") {
  const key = `${folder}/${Date.now()}_${file.originalname}`;
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);
  return key;
}

async function getPresignedUrl(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

module.exports = { s3, uploadToS3, getPresignedUrl, BUCKET };
