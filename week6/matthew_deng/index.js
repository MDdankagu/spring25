const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const users = {}; // Store socket IDs and nicknames
const messages = []; // Store all messages

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on("set nickname", (nickname) => {
    users[socket.id] = nickname;
    console.log(`${nickname} has joined the chat`);
  });

  socket.on('chat message', (data) => {
    const timestamp = new Date().toLocaleTimeString();
    const messageId = new Date().getTime(); // Unique ID based on time
    const message = {
      id: messageId,
      nickname: data.nickname,
      message: data.message,
      timestamp: timestamp,
      userId: socket.id // Store socket ID to ensure only the sender can edit/delete their messages
    };
    messages.push(message); // Store message in server
    io.emit('chat message', message); // Emit message to all clients
  });

  socket.on("typing", (nickname) => {
    socket.broadcast.emit("typing", nickname);
  });

  // Edit message
  socket.on('edit message', (data) => {
    const message = messages.find(msg => msg.id === data.id);
    if (message && message.userId === socket.id) { // Only allow editing if the message was sent by this user
      message.message = data.newMessage; // Update the message content
      message.timestamp = new Date().toLocaleTimeString(); // Update timestamp for the edited message
      io.emit('edit message', message); // Emit updated message to all clients
    }
  });

  // Delete message
  socket.on('delete message', (messageId) => {
    const index = messages.findIndex(msg => msg.id === messageId);
    if (index !== -1 && messages[index].userId === socket.id) { // Only allow deletion if the message was sent by this user
      messages.splice(index, 1); // Remove message from server
      io.emit('delete message', messageId); // Notify clients to delete message
    }
  });

  socket.on('disconnect', () => {
    console.log(`${users[socket.id] || "A user"} has disconnected`);
    delete users[socket.id];
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
