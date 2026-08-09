import prisma from "../config/db.js";

// Get all custom themes for the authenticated user
export async function getCustomThemes(req, res, next) {
  try {
    const themes = await prisma.customTheme.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ themes });
  } catch (err) {
    next(err);
  }
}

// Create a new custom theme
export async function createCustomTheme(req, res, next) {
  try {
    const { name, colors, effects, chatBg } = req.body;

    if (!name || !colors) {
      return res.status(400).json({ error: "Name and colors are required" });
    }

    // Check if user is pro
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.isPro) {
      // Free users can have max 1 custom theme
      const count = await prisma.customTheme.count({ where: { userId: req.userId } });
      if (count >= 1) {
        return res.status(403).json({ error: "Free users can create 1 custom theme. Upgrade to Pro for unlimited." });
      }
      
      // Pro feature: custom chat backgrounds
      if (chatBg) {
        return res.status(403).json({ error: "Custom chat backgrounds are a Pro feature. Please upgrade." });
      }
    }

    const theme = await prisma.customTheme.create({
      data: {
        userId: req.userId,
        name,
        colors,
        effects: effects || {},
        chatBg: chatBg || null,
      },
    });

    res.status(201).json({ theme });
  } catch (err) {
    next(err);
  }
}

// Update an existing custom theme
export async function updateCustomTheme(req, res, next) {
  try {
    const { id } = req.params;
    const { name, colors, effects, chatBg } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.isPro && chatBg !== undefined && chatBg !== null) {
      return res.status(403).json({ error: "Custom chat backgrounds are a Pro feature. Please upgrade." });
    }

    const existing = await prisma.customTheme.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Theme not found" });
    }

    const theme = await prisma.customTheme.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(colors && { colors }),
        ...(effects !== undefined && { effects }),
        ...(chatBg !== undefined && { chatBg }),
      },
    });

    res.json({ theme });
  } catch (err) {
    next(err);
  }
}

// Delete a custom theme
export async function deleteCustomTheme(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.customTheme.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      return res.status(404).json({ error: "Theme not found" });
    }

    await prisma.customTheme.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
