import { z } from "zod";

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url()
});