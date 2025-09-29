const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");


const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.get("/", (req, res) => {
    res.send("Server is running 🚀");
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("chat message", (data) => {
        console.log("Message:", data);
        io.emit("chat message", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));