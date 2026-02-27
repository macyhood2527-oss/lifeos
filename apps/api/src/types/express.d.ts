import "express-session";
import { SessionUser } from "../modules/auth/types";

declare global {
  namespace Express {
    interface User extends SessionUser {}
  }
}

