import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const target = process.argv[2] || "pushkyy";
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: target }, { email: target }] }
  });

  if (!user) {
    console.error(`User not found: ${target}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "SUPER_ADMIN", isPro: true }
  });

  const expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      plan: "PRO",
      status: "ACTIVE",
      source: "ADMIN",
      provider: "NONE",
      notes: "Lifetime SUPER_ADMIN grant",
      expiresAt,
    },
    update: {
      plan: "PRO",
      status: "ACTIVE",
      source: "ADMIN",
      provider: "NONE",
      notes: "Lifetime SUPER_ADMIN grant",
      expiresAt,
    },
  });

  console.log(`SUCCESS: @${user.username} (${user.email}) promoted to SUPER_ADMIN with lifetime PRO.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
