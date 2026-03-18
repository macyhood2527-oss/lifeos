import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "./env";
import { postgresPool } from "../db/pool";

export function createSessionMiddleware() {
  const isProd = env.NODE_ENV === "production";

  let store: session.Store;

  if (env.DB_PROVIDER === "postgres") {
    if (!postgresPool) {
      throw new Error("Postgres session store requested without a configured postgres pool");
    }

    const PgStore = connectPgSimple(session);
    store = new PgStore({
      pool: postgresPool,
      tableName: env.SESSION_TABLE_NAME,
      createTableIfMissing: true,
    });
  } else {
    const MySQLStore = MySQLStoreFactory(session);
    store = new MySQLStore({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    });
  }

  return session({
    name: env.SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: isProd,
      maxAge: 14 * 24 * 60 * 60 * 1000
    }
  });
}
