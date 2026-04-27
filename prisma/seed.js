const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const SEED_PASSWORD = "DevPassword1!";
const ROUNDS = 10;

const SEED_USERS = [
  { email: "player@example.com", name: "Player", role: "PLAYER" },
  { email: "manager@example.com", name: "Branch Manager", role: "BRANCH_MANAGER" },
  { email: "admin@example.com", name: "Admin", role: "ADMIN" },
];

/** Load branches from branches.json (project root) */
function loadBranchesJson() {
  try {
    const filePath = path.join(process.cwd(), "branches.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Could not load branches.json:", e?.message || e);
    return [];
  }
}

async function main() {
  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, ROUNDS);

  const branchesJson = loadBranchesJson();
  const headOfficeJson = branchesJson.find((b) => b.id === 1 || b.branchCode === "ET0010001");

  if (branchesJson.length > 0) {
    for (const b of branchesJson) {
      await prisma.branch.upsert({
        where: { branchCode: b.branchCode },
        create: {
          name: b.companyName || b.branchCode,
          location: "",
          branchCode: b.branchCode,
          externalId: b.id,
        },
        update: {
          name: b.companyName || b.branchCode,
          externalId: b.id,
        },
      });
    }
    console.log("Synced", branchesJson.length, "branches from branches.json");
  }

  let branch = headOfficeJson
    ? await prisma.branch.findFirst({ where: { externalId: headOfficeJson.id } })
    : await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: headOfficeJson?.companyName || "Head Office",
        location: "",
        branchCode: headOfficeJson?.branchCode || "ET0010001",
        externalId: headOfficeJson?.id ?? 1,
      },
    });
  }

  let team = await prisma.team.findFirst({ where: { branchId: branch.id } });
  if (!team) {
    team = await prisma.team.create({
      data: { name: "Alpha", branchId: branch.id },
    });
  }

  const SEED_SCOUT_CATEGORIES = [
    { name: "Cafe", displayName: "Cafe", iconName: "Coffee", displayOrder: 0 },
    { name: "Retail", displayName: "Retail", iconName: "ShoppingCart", displayOrder: 1 },
    { name: "Pharmacy", displayName: "Pharmacy", iconName: "Pill", displayOrder: 2 },
    { name: "Fuel", displayName: "Fuel", iconName: "Fuel", displayOrder: 3 },
    { name: "Other", displayName: "Other", iconName: "Other", displayOrder: 4 },
  ];
  for (const cat of SEED_SCOUT_CATEGORIES) {
    await prisma.scoutCategory.upsert({
      where: { name: cat.name },
      create: { name: cat.name, displayName: cat.displayName, iconName: cat.iconName, displayOrder: cat.displayOrder, active: true },
      update: {},
    });
  }
  console.log("Scout categories:", SEED_SCOUT_CATEGORIES.length);

  for (const u of SEED_USERS) {
    const branchId = u.role === "ADMIN" ? null : branch.id;
    const teamId = u.role === "PLAYER" ? team.id : null;
    const existingByEmail = await prisma.user.findUnique({ where: { email: u.email } });

    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: crypto.randomUUID(),
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        teamId,
        branchId,
        mustChangePassword: false,
      },
      update: {
        name: u.name,
        passwordHash,
        role: u.role,
        teamId,
        branchId,
        mustChangePassword: false,
      },
    });

    if (existingByEmail) {
      console.log("Updated password for", u.email);
    } else {
      console.log("Created", u.email, "(" + u.role + ")");
    }
  }

  console.log("Seed complete. Login with:");
  console.log("  PLAYER:         player@example.com / " + SEED_PASSWORD);
  console.log("  BRANCH_MANAGER: manager@example.com / " + SEED_PASSWORD);
  console.log("  ADMIN:          admin@example.com / " + SEED_PASSWORD);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
