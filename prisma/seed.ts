import { PrismaClient } from "../src/generated/prisma/client.js";
import { Phase, Role } from "../src/generated/prisma/enums.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Upsert test student
  const student = await prisma.user.upsert({
    where: { email: "student@mathquest.dev" },
    update: {},
    create: {
      email: "student@mathquest.dev",
      name: "Alex Student",
      role: Role.STUDENT,
      passwordHash,
      studentProfile: {
        create: {
          currentPhase: Phase.PHASE_0,
          xp: 0,
          level: 1,
          streak: 0,
        },
      },
    },
  });

  // Upsert test teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@mathquest.dev" },
    update: {},
    create: {
      email: "teacher@mathquest.dev",
      name: "Ms. Taylor",
      role: Role.TEACHER,
      passwordHash,
      teacherProfile: {
        create: {
          school: "Demo School",
          bio: "Mathematics teacher passionate about making math fun.",
        },
      },
    },
  });

  console.log("✅ Seed complete:");
  console.log(`   - Users: ${student.name} (student), ${teacher.name} (teacher)`);
  console.log(`\n   Login: student@mathquest.dev / password123`);
  console.log(`   Login: teacher@mathquest.dev / password123`);
  console.log(`\n   Run 'npx tsx prisma/seed-ib-curriculum.ts' to seed the IB curriculum.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
