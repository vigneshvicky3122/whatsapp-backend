const JWT = require("jsonwebtoken");
require("dotenv").config();

const authentication = async (req, res, next) => {
  try {
    let check = JWT.verify(req.headers.authorization, process.env.SECRET_KEY);
    if (check) {
      next();
    }
  } catch (error) {
    res.json({
      statusCode: 400,
      message: "Unauthorized please login",
    });
  }
};
const createToken = async ({ mobile }) => {
  let token = JWT.sign({ mobile }, process.env.SECRET_KEY, {
    expiresIn: "365d",
  });
  return token;
};
module.exports = { authentication, createToken };
