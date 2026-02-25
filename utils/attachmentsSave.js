// //using r2 or s3 to save pdf and return public url

// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// const s3Client = new S3Client({
//   region: "ap-south-1",
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// export async function savePdf(pdfBuffer, filename) {
//   const key = `rfp-emails/${Date.now()}-${filename}`;

//   const command = new PutObjectCommand({
//     Bucket: process.env.AWS_S3_BUCKET,
//     Key: key,
//     Body: pdfBuffer,
//     ContentType: "application/pdf",
//   });

//   await s3Client.send(command);

//   const url = await getSignedUrl(s3Client, command);

//   return url;
// }