import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores and dots"),
  displayName: z.string().min(1).max(40),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "FILE", "VOICE", "GIF", "POLL"]).default("TEXT"),
  content: z.string().nullable().optional(),
  mediaUrl: z.string().url().nullable().optional(),
  replyToId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  forwardedFromId: z.string().uuid().optional(),
  // For offline queue handling
  tempId: z.string().optional(),
  isViewOnce: z.boolean().optional().default(false),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.string().uuid()).min(1),
});
