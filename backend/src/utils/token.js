import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import prisma from "../config/db.js";

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  });
}

export async function signRefreshToken(userId) {
  const token = uuid() + uuid();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650);
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export async function rotateRefreshToken(oldToken) {
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!record || record.expiresAt < new Date()) return null;
  await prisma.refreshToken.delete({ where: { token: oldToken } });
  const newToken = await signRefreshToken(record.userId);
  return { userId: record.userId, newToken };
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 3650,
};
