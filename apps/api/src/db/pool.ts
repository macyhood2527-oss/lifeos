import mysql from "mysql2/promise";
import { Pool as PgPool } from "pg";
import { env } from "../config/env";

type SqlParams = any[] | undefined;

type ResultLike = {
  affectedRows: number;
  insertId?: number;
  rowCount?: number;
};

const mysqlPool = env.DB_PROVIDER === "mysql"
  ? mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      timezone: "Z", // store UTC; convert in app
    })
  : null;

export const postgresPool = env.DB_PROVIDER === "postgres"
  ? new PgPool({
      connectionString: env.DATABASE_URL,
      ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
      max: 10,
    })
  : null;

function convertPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizePostgresSql(sql: string) {
  return convertPlaceholders(sql)
    .replace(/\bNOW\(3\)/g, "CURRENT_TIMESTAMP(3)")
    .replace(/\bNOW\(\)/g, "CURRENT_TIMESTAMP");
}

function maybeAddReturningId(sql: string) {
  const trimmed = sql.trim().replace(/;$/, "");
  if (!/^INSERT\s+INTO/i.test(trimmed) || /\bRETURNING\b/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} RETURNING id`;
}

async function runPostgres<T>(sql: string, params?: SqlParams): Promise<[T, unknown[]]> {
  if (!postgresPool) {
    throw new Error("Postgres pool is not configured");
  }

  const normalizedSql = normalizePostgresSql(sql);
  const text = /^\s*INSERT\s+INTO/i.test(normalizedSql)
    ? maybeAddReturningId(normalizedSql)
    : normalizedSql;

  const result = await postgresPool.query(text, params ?? []);

  if (result.command === "SELECT") {
    return [result.rows as T, []];
  }

  const summary: ResultLike = {
    affectedRows: result.rowCount ?? 0,
    rowCount: result.rowCount ?? 0,
  };

  const insertedId = result.rows[0]?.id;
  if (insertedId !== undefined && insertedId !== null) {
    summary.insertId = Number(insertedId);
  }

  return [summary as T, []];
}

export const pool = {
  async query<T = any>(sql: string, params?: SqlParams): Promise<[T, unknown[]]> {
    if (mysqlPool) {
      return mysqlPool.query(sql, params) as Promise<[T, unknown[]]>;
    }
    return runPostgres<T>(sql, params);
  },

  async execute<T = any>(sql: string, params?: SqlParams): Promise<[T, unknown[]]> {
    if (mysqlPool) {
      return mysqlPool.execute(sql, params) as Promise<[T, unknown[]]>;
    }
    return runPostgres<T>(sql, params);
  },

  async end() {
    if (mysqlPool) {
      await mysqlPool.end();
      return;
    }
    await postgresPool?.end();
  },
};
