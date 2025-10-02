import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Game } from "./services/gamestate.service";
import cookieParser from "cookie-parser";

const app = express()
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(cookieParser());

app.get('/login', (req, res) => {
  // Set cookie via HTTP response
  if (!req.cookies.playerId) {
    const playerId = crypto.randomUUID();
    res.cookie('playerId', playerId, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true
    });
  }
  
  res.send("Logged in");
});

const game = new Game(io);

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));