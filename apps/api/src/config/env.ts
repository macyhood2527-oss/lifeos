import { z } from "zod";

const BaseEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DB_PROVIDER: z.enum(["mysql", "postgres"]).default("mysql"),
  DATABASE_URL: z.string().min(1).optional(),

  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_SSL: z.coerce.boolean().default(false),

  SESSION_SECRET: z.string().min(24),
  SESSION_COOKIE_NAME: z.string().min(1).default("lifeos.sid"),
  SESSION_TABLE_NAME: z.string().min(1).default("user_sessions"),
  JWT_SECRET: z.string().min(24),

  CORS_ORIGIN: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  WEB_APP_URL: z.string().url(),

  VAPID_PUBLIC_KEY: z.string().min(1),
VAPID_PRIVATE_KEY: z.string().min(1),
VAPID_SUBJECT: z.string().min(1),

  TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0)

  
}).superRefine((env, ctx) => {
  if (env.DB_PROVIDER === "postgres") {
    if (!env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when DB_PROVIDER=postgres",
      });
    }
    return;
  }

  const requiredMysqlFields: Array<keyof typeof env> = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
  ];

  for (const field of requiredMysqlFields) {
    if (!env[field]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} is required when DB_PROVIDER=mysql`,
      });
    }
  }
});

const EnvSchema = BaseEnvSchema.transform((env) => ({
  ...env,
  DB_HOST: env.DB_HOST ?? "127.0.0.1",
  DB_PORT: env.DB_PORT ?? (env.DB_PROVIDER === "postgres" ? 5432 : 3306),
  DB_USER: env.DB_USER ?? "",
  DB_PASSWORD: env.DB_PASSWORD ?? "",
  DB_NAME: env.DB_NAME ?? "",
}));

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = (() => {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Helpful, readable error
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
})();
