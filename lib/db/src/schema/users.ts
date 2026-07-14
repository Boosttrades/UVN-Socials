import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  // Last time name/username were changed — enforces a 14-day cooldown between edits.
  profileUpdatedAt: timestamp("profile_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  // Either the account's email address or its username (without the "@").
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    username: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
      .optional(),
    password: z.string().min(1, "Password is required to change your name or username"),
  })
  .refine((data) => data.name !== undefined || data.username !== undefined, {
    message: "Provide a new name or username to update",
  });

export const selectUserSchema = createSelectSchema(usersTable).omit({
  passwordHash: true,
  verificationToken: true,
  verificationTokenExpiresAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type PublicUser = z.infer<typeof selectUserSchema>;
