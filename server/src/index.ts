import dotenv from "dotenv";
dotenv.config({ path: ['.env.development.local', '.env.development', '.env.local', '.env'] })
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Game } from "./services/gamestate.service";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from "jsonwebtoken";
import { IUser, User, UserWithoutPassword } from "../../shared/models/user";


// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

if (!process.env.SERVER_PORT) {
  throw new Error("SERVER_PORT is not defined in environment variables");
}

if (!process.env.SERVER_HOST) {
  throw new Error("SERVER_HOST is not defined in environment variables");
}

if (!process.env.SERVER_JWT_SECRET) {
  throw new Error("SERVER_JWT_SECRET is not defined in environment variables");
}

if (!process.env.SERVER_PLAYER1_PASSWORD || !process.env.SERVER_PLAYER2_PASSWORD) {
  throw new Error("Player passwords are not defined in environment variables");
}

if (!process.env.SERVER_PLAYER1_ID || !process.env.SERVER_PLAYER2_ID) {
  throw new Error("Player IDs are not defined in environment variables");
}

if (!process.env.SERVER_PLAYER1_USERNAME || !process.env.SERVER_PLAYER2_USERNAME) {
  throw new Error("Player usernames are not defined in environment variables");
}

if (process.env.NODE_ENV !== 'production') {
  console.warn("WARNING: The server is running in DEVELOPMENT mode. Do not use this mode in production!");
}

const PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.SERVER_PORT;
const HOST = process.env.SERVER_HOST;
const JWT_SECRET = process.env.SERVER_JWT_SECRET;
const PLAYER1_PASSWORD = process.env.SERVER_PLAYER1_PASSWORD;
const PLAYER2_PASSWORD = process.env.SERVER_PLAYER2_PASSWORD;
const PLAYER1_ID = process.env.SERVER_PLAYER1_ID;
const PLAYER2_ID = process.env.SERVER_PLAYER2_ID;
const PLAYER1_USERNAME = process.env.SERVER_PLAYER1_USERNAME;
const PLAYER2_USERNAME = process.env.SERVER_PLAYER2_USERNAME;



const app = express()
const server = createServer(app);

app.use(cors());
app.use(cookieParser());
app.use(express.json());


// Hardcoded user credentials
const Users: User[] = [
  new User(PLAYER1_ID, PLAYER1_USERNAME, PLAYER1_PASSWORD),
  new User(PLAYER2_ID, PLAYER2_USERNAME, PLAYER2_PASSWORD)
]

app.use(passport.initialize());

// Passport local strategy for username/password
passport.use(
  'login',
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    async (username, password, done) => {
      try {
        const user = Users.find(u => u.username === username);

        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        const validate = user.password === password;

        if (!validate) {
          return done(null, false, { message: 'Wrong Password' });
        }

        return done(null, { id: user.id, username: user.username }, { message: 'Logged in Successfully' });
      } catch (error) {
        return done(error);
      }
    }
  )
);


const options = { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: JWT_SECRET };
passport.use('jwt', new JwtStrategy(options, function (jwt_payload, done) {
  const user = Users.find(u => u.id === jwt_payload.user.playerId);
  if (user) {
    return done(null, { username: user.username, playerId: jwt_payload.user.playerId });
  } else {
    return done(null, false);
  }
}));


app.get('/login', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ user: req.user });
});

app.post(
  '/login',
  async (req, res, next) => {
    passport.authenticate(
      'login',
      async (err: any, user: IUser, info: any) => {
        try {

          // Delay login response by 1 second to mitigate brute-force attacks
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (err) {
            return next(err);
          }

          if (!user) {
            return res.status(401).json({ message: 'Login failed' });
          }

          req.login(user, { session: false }, async (error) => {
              if (error) return next(error);

              const body = { playerId: user.id, username: user.username };
              // Sign the JWT token with expiry of 1 day
              const token = jwt.sign({ user: body }, JWT_SECRET, { expiresIn: '1d' });

              return res.json({ token });
            }
          );
        } catch (error) {
          return next(error);
        }
      }
    )(req, res, next);
  }
);

const io = new Server(server, PRODUCTION ? {} : {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  }
});

// Extend Socket type to include 'user'
declare module "socket.io" {
  interface Socket {
    user?: any;
  }
}

// Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: { playerId: string, username: string } };
    socket.user = decoded.user; // Attach user info to the socket object
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

const game = new Game(io, Users.map((u) => new UserWithoutPassword(u.id, u.username)));


server.listen({ host: HOST, port: PORT }, () => console.log(`Server running on http://${HOST}:${PORT}`));