const express = require("express");
const env = require("dotenv");
env.config();
const app = express();
const cors = require("cors");
const http = require("http");
const server = http.createServer(app);
app.use(cors({ origin: "*" }));
const { Server } = require("socket.io");

const PORT = process.env.PORT || 8000;
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (RoomId) => {
    socket.join(RoomId);
    console.log(`User with Id: ${socket.id} joined room: ${RoomId}`);
  });

  socket.on("send_message", (Message) => {
    socket.to(Message.room).emit("receive_message", Message);
  });

  socket.on("leave", (RoomId) => {
    if (socket.id) {
      socket.leave(RoomId);
      console.log(`User with Id: ${socket.id} leaving room ${RoomId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log("listening on port " + PORT);
});

