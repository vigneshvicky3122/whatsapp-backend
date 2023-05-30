const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3 = new S3Client({
  region: process.env.S3_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_PASS,
  },
});

async function uploadFileVideo(base64, filename) {
  const base64Data = new Buffer.from(
    base64.replace(/^data:video\/\w+;base64,/, ""),
    "base64"
  );

  const type = base64.split(";")[0].split("/")[1];

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Body: base64Data,
    ContentType: `video/${type}`,
    ContentEncoding: "base64",
    Key: `${filename}.${type}`,
  };
  try {
    const command = new PutObjectCommand(uploadParams);
    const response = await s3.send(command);
    if (response) {
      return uploadParams.Key;
    }
  } catch (err) {
    return console.log(err);
  }
}
async function uploadFileImage(base64, filename) {
  const base64Data = new Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  const type = base64.split(";")[0].split("/")[1];

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Body: base64Data,
    ContentType: `image/${type}`,
    ContentEncoding: "base64",
    Key: `${filename}.${type}`,
  };
  try {
    const command = new PutObjectCommand(uploadParams);
    const response = await s3.send(command);
    if (response) {
      return uploadParams.Key;
    }
  } catch (err) {
    return console.log(err);
  }
}
module.exports = { uploadFileImage, uploadFileVideo };
