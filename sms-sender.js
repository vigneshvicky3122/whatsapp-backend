const unirest = require("unirest");
const env = require("dotenv");
env.config();

async function sendOtp(OTP, MobileNumber, response) {
  const request = unirest("POST", "https://www.fast2sms.com/dev/bulkV2");
  request.headers({
    authorization: process.env.SMS_AUTHORIZATION_KEY,
    "Content-Type": "application/json",
  });
  request.form({
    variables_values: OTP,
    route: "otp",
    numbers: MobileNumber,
  });
  request.end((res) => {
    if (res.error) new Error(res.error);
    console.log(res.body);
    if (res.body.return === true) {
      response.json({
        statusCode: 201,
        message: "OTP send successfully",
      });
    } else {
      response.json({
        statusCode: 404,
        message: "Invalid Mobile Number",
      });
    }
  });
}
module.exports = { sendOtp };
