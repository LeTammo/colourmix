import { IUser } from "../../shared/models/user";

declare global {
  namespace Express {
    // Make req.user available and typed throughout the server code
    interface Request {
      user?: IUser;
    }
  }
}

export {};
