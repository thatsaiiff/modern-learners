import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Initializing Modern Learners database...");

  const adminUsername = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@modernlearners.com").trim().toLowerCase();
  const adminName = process.env.ADMIN_NAME || "Saif Sir (Admin)";
  const adminPassword = process.env.ADMIN_PASSWORD;

  const isProduction = process.env.NODE_ENV === "production";

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ username: adminUsername }, { email: adminEmail }, { role: UserRole.ADMIN }],
    },
  });

  if (existingAdmin) {
    console.log(`ℹ️ Admin user already exists: ${existingAdmin.name} (${existingAdmin.username}). Preserving credentials.`);
  } else {
    // Creating new Admin
    let passwordToHash = adminPassword;

    if (!passwordToHash) {
      if (isProduction) {
        throw new Error(
          "❌ PRODUCTION SECURITY ERROR: ADMIN_PASSWORD environment variable is required to create the primary administrator account in production."
        );
      }
      // Local development fallback
      passwordToHash = "Admin@ModernLearnersDev";
    }

    const adminPasswordHash = await bcrypt.hash(passwordToHash, 10);
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        name: adminName,
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Primary Admin account initialized: ${admin.name} (${admin.username})`);
  }

  // 2. Seed Academic Session 2026-27
  const session = await prisma.academicSession.upsert({
    where: { name: "2026-27" },
    update: { isActive: true },
    create: {
      name: "2026-27",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2027-03-31T23:59:59.999Z"),
      isActive: true,
    },
  });
  console.log(`✅ Active Academic Session: ${session.name}`);

  // 3. Seed Classes 6 to 10
  const classNumbers = [6, 7, 8, 9, 10];
  const classMap = new Map<number, string>();

  for (const num of classNumbers) {
    const cls = await prisma.class.upsert({
      where: { classNumber: num },
      update: {},
      create: {
        classNumber: num,
        name: `Class ${num}`,
        isActive: true,
      },
    });
    classMap.set(num, cls.id);
  }
  console.log(`✅ Classes seeded: 6, 7, 8, 9, 10`);

  // 4. Seed Subjects
  const subjectsData = [
    { name: "Mathematics", code: "MAT" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHEM" },
    { name: "Biology", code: "BIO" },
    { name: "Computer Applications", code: "COMP" },
  ];

  const subjectMap = new Map<string, string>();

  for (const s of subjectsData) {
    const sub = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: {
        name: s.name,
        code: s.code,
        isActive: true,
      },
    });
    subjectMap.set(s.code, sub.id);
  }
  console.log(`✅ Subjects seeded: ${subjectsData.map((s) => s.code).join(", ")}`);

  // 5. Seed Class-Subject Mappings
  for (const [, classId] of classMap) {
    for (const [, subjectId] of subjectMap) {
      await prisma.classSubject.upsert({
        where: {
          classId_subjectId: { classId, subjectId },
        },
        update: {},
        create: {
          classId,
          subjectId,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ Class-Subject relationships configured`);

  // 6. Seed Sample Chapter and Topics for Class 8 Physics
  const class8Id = classMap.get(8);
  const phyId = subjectMap.get("PHY");

  if (class8Id && phyId) {
    let chapter = await prisma.chapter.findFirst({
      where: { classId: class8Id, subjectId: phyId, name: "Work, Energy & Power" },
    });

    if (!chapter) {
      chapter = await prisma.chapter.create({
        data: {
          classId: class8Id,
          subjectId: phyId,
          name: "Work, Energy & Power",
          description: "ICSE Class 8 Physics Chapter covering Work, Energy and Power concepts",
          orderNumber: 1,
        },
      });

      const topics = ["Work", "Energy", "Power", "Numericals"];
      for (const tName of topics) {
        await prisma.topic.create({
          data: {
            chapterId: chapter.id,
            name: tName,
            description: `${tName} conceptual fundamentals and problems`,
          },
        });
      }
      console.log(`✅ Seeded Chapter: ${chapter.name} with ${topics.length} topics`);
    }
  }

  // 7. Seed System Settings
  const settings = [
    {
      key: "DEFAULT_PASSING_PERCENTAGE",
      value: 80,
      description: "Default passing threshold percentage for exams",
    },
    {
      key: "LEADERBOARD_ENABLED",
      value: true,
      description: "Whether student leaderboards are active",
    },
    {
      key: "LEADERBOARD_PRIVACY",
      value: {
        showName: true,
        showRollNumber: true,
        showMarks: true,
        showPassRate: true,
        showClass: true,
      },
      description: "Display settings for public leaderboards",
    },
    {
      key: "DEFAULT_GRADING_TIERS",
      value: [
        { min: 100, max: 100, label: "OP — Outstandingly Perfect" },
        { min: 95, max: 99.99, label: "Outstanding" },
        { min: 90, max: 94.99, label: "Excellent" },
        { min: 80, max: 89.99, label: "Pass" },
        { min: 0, max: 79.99, label: "Fail — Needs Improvement" },
      ],
      description: "Standard grade range mapping for academic results",
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: {
        key: s.key,
        value: s.value,
        description: s.description,
      },
    });
  }
  console.log(`✅ System settings initialized`);

  console.log("🎉 Database initialization completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Initialization failed:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
