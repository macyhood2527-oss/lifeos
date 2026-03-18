#!/usr/bin/env node

const mysql = require("mysql2/promise");
const { Client } = require("pg");

const requiredSourceEnv = [
  "SRC_DB_HOST",
  "SRC_DB_PORT",
  "SRC_DB_USER",
  "SRC_DB_PASSWORD",
  "SRC_DB_NAME",
];

const requiredTargetEnv = ["DATABASE_URL"];

function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function toBool(value, defaultValue = true) {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false";
  return defaultValue;
}

function toNullableIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toTimeOnly(value) {
  if (!value) return null;
  return String(value).slice(0, 8);
}

function toDayArray(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.length ? value : null;
  const items = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

async function readSource(mysqlPool, sql) {
  const [rows] = await mysqlPool.query(sql);
  return rows;
}

async function truncateTables(pgClient) {
  await pgClient.query(`
    TRUNCATE TABLE
      notification_log,
      push_subscriptions,
      reminders,
      reflections,
      habit_checkins,
      habits,
      tasks,
      projects,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function insertRows(pgClient, tableName, columns, rows) {
  if (!rows.length) return;

  const valueBlocks = [];
  const values = [];
  let paramIndex = 1;

  for (const row of rows) {
    const placeholders = columns.map(() => `$${paramIndex++}`);
    valueBlocks.push(`(${placeholders.join(", ")})`);
    values.push(...columns.map((column) => row[column]));
  }

  const sql = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES ${valueBlocks.join(", ")}
  `;

  await pgClient.query(sql, values);
}

async function syncSequence(pgClient, tableName) {
  await pgClient.query(
    `
    SELECT setval(
      pg_get_serial_sequence($1, 'id'),
      COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
      (SELECT COUNT(*) > 0 FROM ${tableName})
    )
    `,
    [tableName]
  );
}

async function main() {
  requireEnv(requiredSourceEnv);
  requireEnv(requiredTargetEnv);

  const mysqlPool = mysql.createPool({
    host: process.env.SRC_DB_HOST,
    port: Number(process.env.SRC_DB_PORT),
    user: process.env.SRC_DB_USER,
    password: process.env.SRC_DB_PASSWORD,
    database: process.env.SRC_DB_NAME,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    dateStrings: true,
    timezone: "Z",
  });

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pgClient.connect();

    const [
      users,
      projects,
      tasks,
      habits,
      habitCheckins,
      reflections,
      reminders,
      pushSubscriptions,
      notificationLog,
    ] = await Promise.all([
      readSource(mysqlPool, "SELECT * FROM users ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM projects ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM tasks ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM habits ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM habit_checkins ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM reflections ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM reminders ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM push_subscriptions ORDER BY id ASC"),
      readSource(mysqlPool, "SELECT * FROM notification_log ORDER BY id ASC"),
    ]);

    console.log("[migration] source counts", {
      users: users.length,
      projects: projects.length,
      tasks: tasks.length,
      habits: habits.length,
      habit_checkins: habitCheckins.length,
      reflections: reflections.length,
      reminders: reminders.length,
      push_subscriptions: pushSubscriptions.length,
      notification_log: notificationLog.length,
    });

    await pgClient.query("begin");
    await truncateTables(pgClient);

    await insertRows(
      pgClient,
      "users",
      [
        "id",
        "google_id",
        "email",
        "password_hash",
        "name",
        "avatar_url",
        "timezone",
        "tone",
        "quiet_hours_start",
        "quiet_hours_end",
        "reminders_enabled",
        "habit_nudges_enabled",
        "weekly_recap_enabled",
        "created_at",
        "updated_at",
      ],
      users.map((row) => ({
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        password_hash: row.password_hash ?? null,
        name: row.name,
        avatar_url: row.avatar_url ?? null,
        timezone: row.timezone || "Asia/Manila",
        tone: row.tone || "gentle",
        quiet_hours_start: toTimeOnly(row.quiet_hours_start),
        quiet_hours_end: toTimeOnly(row.quiet_hours_end),
        reminders_enabled: toBool(row.reminders_enabled, true),
        habit_nudges_enabled: toBool(row.habit_nudges_enabled, true),
        weekly_recap_enabled: toBool(row.weekly_recap_enabled, true),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "projects",
      ["id", "user_id", "name", "description", "color", "sort_order", "archived_at", "created_at", "updated_at"],
      projects.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        description: row.description ?? null,
        color: row.color ?? null,
        sort_order: Number(row.sort_order ?? 0),
        archived_at: toNullableIso(row.archived_at),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "tasks",
      [
        "id",
        "user_id",
        "project_id",
        "title",
        "notes",
        "status",
        "priority",
        "due_date",
        "completed_at",
        "sort_order",
        "created_at",
        "updated_at",
      ],
      tasks.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        project_id: row.project_id ?? null,
        title: row.title,
        notes: row.notes ?? null,
        status: row.status || "todo",
        priority: row.priority || "medium",
        due_date: toDateOnly(row.due_date),
        completed_at: toNullableIso(row.completed_at),
        sort_order: Number(row.sort_order ?? 0),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "habits",
      ["id", "user_id", "name", "description", "active", "sort_order", "cadence", "target_per_period", "created_at", "updated_at"],
      habits.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        description: row.description ?? null,
        active: toBool(row.active, true),
        sort_order: Number(row.sort_order ?? 0),
        cadence: row.cadence || "daily",
        target_per_period: Math.max(1, Number(row.target_per_period ?? 1)),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "habit_checkins",
      ["id", "user_id", "habit_id", "checkin_date", "value", "created_at"],
      habitCheckins.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        habit_id: row.habit_id,
        checkin_date: toDateOnly(row.checkin_date),
        value: Math.max(1, Number(row.value ?? 1)),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "reflections",
      [
        "id",
        "user_id",
        "reflect_date",
        "mood",
        "gratitude",
        "highlights",
        "challenges",
        "notes",
        "created_at",
        "updated_at",
      ],
      reflections.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        reflect_date: toDateOnly(row.reflect_date),
        mood: row.mood === null || row.mood === undefined ? null : Number(row.mood),
        gratitude: row.gratitude ?? null,
        highlights: row.highlights ?? null,
        challenges: row.challenges ?? null,
        notes: row.notes ?? null,
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "reminders",
      [
        "id",
        "user_id",
        "entity_type",
        "entity_id",
        "enabled",
        "schedule_type",
        "due_at",
        "time_of_day",
        "days_of_week",
        "cron_expr",
        "respect_quiet_hours",
        "last_run_at",
        "next_run_at",
        "created_at",
        "updated_at",
      ],
      reminders.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        enabled: toBool(row.enabled, true),
        schedule_type: row.schedule_type || "daily",
        due_at: toNullableIso(row.due_at),
        time_of_day: toTimeOnly(row.time_of_day),
        days_of_week: toDayArray(row.days_of_week),
        cron_expr: row.cron_expr ?? null,
        respect_quiet_hours: toBool(row.respect_quiet_hours, true),
        last_run_at: toNullableIso(row.last_run_at),
        next_run_at: toNullableIso(row.next_run_at),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "push_subscriptions",
      ["id", "user_id", "endpoint", "p256dh", "auth", "user_agent", "last_seen_at", "created_at", "updated_at"],
      pushSubscriptions.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
        user_agent: row.user_agent ?? null,
        last_seen_at: toNullableIso(row.last_seen_at) || toNullableIso(row.created_at) || new Date().toISOString(),
        created_at: toNullableIso(row.created_at) || new Date().toISOString(),
        updated_at: toNullableIso(row.updated_at) || new Date().toISOString(),
      }))
    );

    await insertRows(
      pgClient,
      "notification_log",
      ["id", "user_id", "reminder_id", "run_key", "sent_at", "status", "error_message"],
      notificationLog.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        reminder_id: row.reminder_id,
        run_key: row.run_key,
        sent_at: toNullableIso(row.sent_at) || new Date().toISOString(),
        status: row.status,
        error_message: row.error_message ?? null,
      }))
    );

    for (const tableName of [
      "users",
      "projects",
      "tasks",
      "habits",
      "habit_checkins",
      "reflections",
      "reminders",
      "push_subscriptions",
      "notification_log",
    ]) {
      await syncSequence(pgClient, tableName);
    }

    await pgClient.query("commit");
    console.log("[migration] completed successfully");
  } catch (error) {
    try {
      await pgClient.query("rollback");
    } catch (_) {
      // ignore rollback errors
    }
    console.error("[migration] failed", error);
    process.exitCode = 1;
  } finally {
    await mysqlPool.end();
    await pgClient.end();
  }
}

main().catch((error) => {
  console.error("[migration] fatal", error);
  process.exit(1);
});
