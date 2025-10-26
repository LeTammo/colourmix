import dotenv from "dotenv";
dotenv.config({ path: ['.env.development.local', '.env.development', '.env.local', '.env'] })
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from "jsonwebtoken";
import { IUser, JwtPayload, User, UserWithoutPassword } from "../../shared/models/user";
import { GamesService } from "./services/games.service";
import { validateCreateGame } from "./lib/validation";

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

// Hardcoded user credentials
const Users: User[] = [
  new User(PLAYER1_ID, PLAYER1_USERNAME, PLAYER1_PASSWORD),
  new User(PLAYER2_ID, PLAYER2_USERNAME, PLAYER2_PASSWORD)
]


const app = express()
const server = createServer(app);

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
    gameId?: string;
  }
}

const gamesService = new GamesService(io, Users.map(u => new UserWithoutPassword(u.id, u.username)));

app.use(cors());
app.use(cookieParser());
app.use(express.json());
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
          return done(null, false, { message: 'Unauthorized' });
        }

        const validate = user.password === password;

        if (!validate) {
          return done(null, false, { message: 'Unauthorized' });
        }

        return done(null, { id: user.id, username: user.username }, { message: 'Logged in Successfully' });
      } catch (error) {
        return done(error);
      }
    }
  )
);


const options = { jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: JWT_SECRET };
passport.use('jwt', new JwtStrategy(options, function (jwt_payload: JwtPayload, done) {
  const user = Users.find(u => u.id === jwt_payload.user.id);
  if (user) {
    return done(null, { username: user.username, id: jwt_payload.user.id });
  } else {
    return done(null, false);
  }
}));


app.get('/player/games', passport.authenticate('jwt', { session: false }), (req, res) => {
  // passport.authenticate('jwt') already rejects unauthenticated requests.
  // `req.user` is typed via `src/types/express.d.ts` and should be present here.
  const playerId = (req.user as IUser).id;
  const games = gamesService.getGamesByPlayerId(playerId).map(g => g.getOutgoingGameState(playerId));
  res.json(games);
});

app.post('/game', passport.authenticate('jwt', { session: false }), (req, res) => {
  const playerId = (req.user as IUser).id;

  try {
    const payload = req.body;
    const validatedPayload = validateCreateGame(payload); // Validate input

    const gameId = crypto.randomUUID();
    gamesService.createGame(gameId, playerId, validatedPayload);
    return res.status(201).json({ gameId: gameId });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create game' });
  }
});

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
          if (err) {
            return next(err);
          }

          if (!user) {
            return res.status(401).json({ message: 'Login failed' });
          }

          req.login(user, { session: false }, async (error) => {
              if (error) return next(error);

              const body: JwtPayload = { user: { id: user.id, username: user.username } };
              // Sign the JWT token with expiry of 1 day
              const token = jwt.sign(body, JWT_SECRET, { expiresIn: '1d' });

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



// Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // TODO: Validate decoded payload structure
    if (!decoded || !decoded.user) {
      return next(new Error('Authentication error: Invalid token payload'));
    }

    if (!decoded.user.id || !Users.find(u => u.id === decoded.user.id)) {
      return next(new Error('Authentication error: User not found'));
    } 

    socket.user = decoded.user; // Attach user info to the socket object

    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});



// For testing purposes, create two games on server start
const firstUser = Users[0];

if (!firstUser) {
  throw new Error("First user not found");
}

gamesService.createGame("first-game", firstUser.id, {
  gameTitle: "First Game",
  minCards: 2,
  maxCards: 4,
  timerDuration: 15,
  maxPlayers: 4,
  maxRounds: 2,
  inviteCode: "aaaa-bbbb"
});

// Create second game with only first user as player
gamesService.createGame("second-game", firstUser.id, {
  gameTitle: "Second Game",
  minCards: 2,
  maxCards: 2,
  timerDuration: 20,
  maxPlayers: 1,
  maxRounds: 2,
  inviteCode: undefined
});


server.listen({ host: HOST, port: PORT }, () => console.log(`Server running on http://${HOST}:${PORT}`));