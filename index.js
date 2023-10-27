const express = require("express");
const env = require("dotenv");
env.config();
const app = express();
const cors = require("cors");
const http = require("http");
const server = http.createServer(app);
app.use(express.json({ limit: "50mb", extended: true }), cors({ origin: "*" }));
const { Server } = require("socket.io");
const { sendOtp } = require("./sms-sender");
const { ObjectId, Client, collection } = require("./database");
const { uploadFileImage, uploadFileVideo } = require("./S3");
const { authentication, createToken } = require("./auth");
const { hashPassword, hashCompare } = require("./hashPassword");
const PORT = process.env.PORT || 8000;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  socket.emit("UserStatus", { UserId: socket.id, isOnline: true });

  socket.on("join_room", async (RoomId) => {
    await Client.connect();
    try {
      let check = await collection[1]
        .find({
          participants: {
            $all: [parseInt(RoomId.author), parseInt(RoomId.receiver)],
          },
        })
        .toArray();

      if (check.length === 0) {
        let set = await collection[1].insertOne({
          participants: [parseInt(RoomId.author), parseInt(RoomId.receiver)],
          createdAt: new Date(),
          messages: [],
        });
        if (set) {
          let review = await collection[1]
            .find({
              participants: {
                $all: [parseInt(RoomId.author), parseInt(RoomId.receiver)],
              },
            })
            .toArray();
          if (review) {
            socket.join(review[0]._id.toString());
            console.log(
              `User with Id: ${socket.id} joined room: ${review[0]._id}`
            );
          }
        }
      } else {
        socket.join(check[0]._id.toString());
        console.log(`User with Id: ${socket.id} joined room: ${check[0]._id}`);
      }
    } catch (err) {
      console.log(err);
    }
  });
  socket.on("send_message", async (Message) => {
    await Client.connect();

    try {
      let push = await collection[1].findOneAndUpdate(
        {
          participants: {
            $all: [Message.messageData.sender, Message.receiver],
          },
        },
        {
          $push: {
            messages: Message.messageData,
          },
        }
      );

      if (push) {
        socket
          .to(push.value._id.toString())
          .emit("receive_message", Message.messageData);
      }
    } catch (error) {
      console.log(error);
    }
  });
  socket.on("delete-for-me", async (Message) => {
    await Client.connect();

    try {
      let update = await collection[1].findOneAndUpdate(
        {
          messages: { $elemMatch: { message_id: Message.message_id } },
        },
        {
          $push: {
            "messages.$.isDelete": Message.author,
          },
        }
      );
      if (update) {
        console.log(update);
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("leave", (RoomId) => {
    if (socket.id) {
      socket.leave(RoomId);
      console.log(`User with Id: ${socket.id} leaving room ${RoomId}`);
    }
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log(`User Disconnected: ${socket.id}`);
    socket.emit("UserStatus", { UserId: socket.id, isOnline: false });
  });
});

app.get("/user", authentication, async (req, res) => {
  await Client.connect();
  try {
    let user = await collection[0]
      .find({ Mobile: parseInt(req.headers.mobile) })
      .toArray();
    if (user.length !== 0) {
      res.json({
        statusCode: 200,
        message: "User already exists",
        user,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "User does't exists",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});
app.get("/users", authentication, async (req, res) => {
  await Client.connect();
  try {
    let user = await collection[0]
      .find({ Mobile: parseInt(req.headers.mobile) })
      .toArray();
    let chats = await collection[1]
      .find({ participants: { $in: [parseInt(req.headers.mobile)] } })
      .toArray();
    let users = await collection[0].find().toArray();

    if (users.length !== 0) {
      res.json({
        statusCode: 200,
        message: "success",
        user,
        users,
        chats,
      });
    } else {
      res.json({
        statusCode: 401,
        message: "failed",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});
app.post("/signup", async (req, res) => {
  await Client.connect();
  try {
    let digits = "123456789";
    let Otp = "";
    for (let i = 0; i < 6; i++) {
      Otp += digits[Math.floor(Math.random() * 9)];
    }
    if (Otp.length === 6) {
      let check = await collection[0]
        .find({ Mobile: req.body.mobile })
        .toArray();
      if (check.length === 0) {
        let post = await collection[0].insertOne({
          Mobile: req.body.mobile,
          Otp: await hashPassword(Otp),
          Name: null,
          Profile: null,
          createdAt: new Date(),
          MyContacts:[],
        });
        if (post) {
          await sendOtp(Otp, req.body.mobile, res);
        }
      } else {
        let post = await collection[0].findOneAndUpdate(
          {
            Mobile: req.body.mobile,
          },
          { $set: { Otp: await hashPassword(Otp) } }
        );
        if (post) {
          await sendOtp(Otp, req.body.mobile, res);
        }
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});
app.post("/verification/otp", async (req, res) => {
  await Client.connect();
  try {
    let check = await collection[0]
      .find({ Mobile: parseInt(req.body.mobile) })
      .toArray();
    let compare = await hashCompare(req.body.otp, check[0].Otp);
    if (compare) {
      let token = await createToken(req.body.mobile);
      if (token) {
        res.json({
          statusCode: 200,
          message: "Verification successful",
          token,
        });
      } else {
        res.json({
          statusCode: 401,
          message: "Can't generate token",
        });
      }
    } else {
      res.json({
        statusCode: 400,
        message: "Invalid OTP",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});
app.post("/profile/set", async (req, res) => {
  await Client.connect();
  try {
    var post;
    if (req.body.profile.startsWith("https://")) {
      post = await collection[0].findOneAndUpdate(
        { Mobile: parseInt(req.body.mobile) },
        { $set: { Profile: req.body.profile, Name: req.body.name } }
      );
    } else {
      let uploadProfileImage = await uploadFileImage(
        req.body.profile,
        `${req.body.mobile}'s profile`
      );
      if (uploadProfileImage) {
        post = await collection[0].findOneAndUpdate(
          { Mobile: parseInt(req.body.mobile) },
          {
            $set: {
              Profile: process.env.AWS_CLOUDFRONT_KEY + uploadProfileImage,
              Name: req.body.name,
            },
          }
        );
      } else {
        res.json({
          statusCode: 400,
          message: "Can't upload, Retry...",
        });
      }
    }
    if (post) {
      res.json({
        statusCode: 200,
        message: "Dear User, Welcome to the ChatBot!",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});
app.post("/save/contact", authentication, async (req, res) => {
  await Client.connect();

  try {
    let post = await collection[0].findOneAndUpdate(
      { Mobile: parseInt(req.headers.mobile) },
      { $push: { MyContacts: req.body.data } }
    );
    if (post) {
      res.json({
        statusCode: 200,
        message: "Contact Saved",
      });
    } else {
      res.json({
        statusCode: 401,
        message: "Failed",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  } finally {
    await Client.close();
  }
});

server.listen(PORT, () => {
  console.log("listening on port " + PORT);
});
