import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import { env } from "./env";

export function createSessionMiddleware() {
  const MySQLStore = MySQLStoreFactory(session);

  const sessionStore = new MySQLStore({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME
  });

  const isProd = env.NODE_ENV === "production";

  return session({
    name: env.SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 14 * 24 * 60 * 60 * 1000
    }
  });
}