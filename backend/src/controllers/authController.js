import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/db.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validators.js";
import {
  signAccessToken,
  signRefreshToken,
  rotateRefreshToken,
  COOKIE_OPTIONS,
} from "../utils/token.js";
import { sendEmail } from "../utils/mailer.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      return res.status(409).json({ error: "Email or username already taken" });
    }

    const hashed = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        password: hashed,
      },
    });

    const verifyToken = uuid();
    await prisma.emailToken.create({
      data: {
        token: verifyToken,
        type: "VERIFY",
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await sendEmail({
      to: user.email,
      subject: "Verify your email",
      html: `<p>Welcome ${user.displayName}! Click to verify: <a href="${process.env.CLIENT_URL}/verify-email?token=${verifyToken}">Verify Email</a></p>`,
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id, req.headers["user-agent"], req.ip);
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(data.password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.isBanned) {
      return res.status(403).json({ error: `Account banned: ${user.banReason || 'Violations of terms of service.'}` });
    }
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      return res.status(403).json({ error: `Account suspended until ${new Date(user.bannedUntil).toLocaleString()}: ${user.banReason || 'Violations.'}` });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id, req.headers["user-agent"], req.ip);
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.json({ accessToken, refreshToken, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { idToken, mode } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: payload.email } });
    }

    let isNewUser = false;

    if (!user) {
      if (mode === "login") {
        return res.status(404).json({ error: "Account not found. Please create an account first." });
      }

      const baseUsername = payload.email.split("@")[0];
      user = await prisma.user.create({
        data: {
          email: payload.email,
          username: `${baseUsername}${Math.floor(Math.random() * 1000)}`,
          displayName: payload.name,
          avatarUrl: payload.picture,
          googleId: payload.sub,
          isEmailVerified: true,
        },
      });
      isNewUser = true;
    } else {
      // If existing user: link Google account and log them in regardless of mode
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, isEmailVerified: true },
        });
      }
    }

    if (user.isBanned) {
      return res.status(403).json({ error: `Account banned: ${user.banReason || 'Violations of terms of service.'}` });
    }
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      return res.status(403).json({ error: `Account suspended until ${new Date(user.bannedUntil).toLocaleString()}: ${user.banReason || 'Violations.'}` });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = await signRefreshToken(user.id, req.headers["user-agent"], req.ip);
    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    // hasPassword lets frontend know if user can set/change a password
    const hasPassword = !!user.password;

    res.json({ accessToken, refreshToken, user: sanitizeUser(user), isNewUser, hasPassword });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const result = await rotateRefreshToken(token, req.headers["user-agent"], req.ip);
    if (!result) return res.status(401).json({ error: "Invalid refresh token" });

    res.cookie("refreshToken", result.newToken, COOKIE_OPTIONS);
    const accessToken = signAccessToken(result.userId);
    res.json({ accessToken, refreshToken: result.newToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    if (req.userId) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { isOnline: false, lastSeen: new Date() },
      });
    }
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const record = await prisma.emailToken.findUnique({ where: { token } });
    if (!record || record.type !== "VERIFY" || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    await prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true },
    });
    await prisma.emailToken.delete({ where: { token } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond 200 to avoid leaking which emails exist
    if (!user) return res.json({ success: true });

    const token = uuid();
    await prisma.emailToken.create({
      data: {
        token,
        type: "RESET",
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });

    await sendEmail({
      to: email,
      subject: "Reset your password",
      html: `<p>Reset your password: <a href="${process.env.CLIENT_URL}/reset-password?token=${token}">Reset Password</a> (expires in 30 min)</p>`,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const record = await prisma.emailToken.findUnique({ where: { token } });
    if (!record || record.type !== "RESET" || record.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
    await prisma.emailToken.delete({ where: { token } });
    await prisma.refreshToken.deleteMany({ where: { userId: record.userId } }); // log out everywhere

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const hasPassword = !!user.password;
    res.json({ user: sanitizeUser(user), hasPassword });
  } catch (err) {
    next(err);
  }
}

// Set password for Google-only accounts (no existing password)
export async function setPassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.password) {
      return res.status(400).json({ error: "Password already set. Use change password instead." });
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Change password for accounts that already have one
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.password) {
      // Verify current password
      if (!currentPassword) return res.status(400).json({ error: "Current password is required" });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

function sanitizeUser(user) {
  const { password, googleId, email, ...safe } = user;
  return safe;
}

export async function getSessions(req, res, next) {
  try {
    const currentToken = req.cookies.refreshToken;
    let currentSessionId = null;
    if (currentToken) {
      const current = await prisma.refreshToken.findUnique({ where: { token: currentToken } });
      if (current) currentSessionId = current.id;
    }

    const sessions = await prisma.refreshToken.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        userAgent: true,
        ip: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ sessions, currentSessionId });
  } catch (err) {
    next(err);
  }
}

export async function deleteSession(req, res, next) {
  try {
    const { sessionId } = req.params;
    const session = await prisma.refreshToken.findUnique({
      where: { id: sessionId }
    });
    if (!session || session.userId !== req.userId) {
      return res.status(404).json({ error: "Session not found" });
    }
    await prisma.refreshToken.delete({ where: { id: sessionId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
