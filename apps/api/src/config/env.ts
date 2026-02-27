import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  SESSION_SECRET: z.string().min(24),
  SESSION_COOKIE_NAME: z.string().min(1).default("lifeos.sid"),

  CORS_ORIGIN: z.string().min(1),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  WEB_APP_URL: z.string().url(),

  VAPID_PUBLIC_KEY: z.string().min(1),
VAPID_PRIVATE_KEY: z.string().min(1),
VAPID_SUBJECT: z.string().min(1),

  TRUST_PROXY: z.coerce.number().int().min(0).max(1).default(0)

  
});

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