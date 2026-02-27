export type SessionUser = {
  id: number;
  email: string;
  name: string;
  avatar_url?: string | null;
  timezone?: string;
  tone?: "gentle" | "neutral" | "direct";
};