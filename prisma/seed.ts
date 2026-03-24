import { PrismaClient } from "../src/generated/prisma/client.js";
import { Phase, ProblemType, Role } from "../src/generated/prisma/enums.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.submission.deleteMany();
  await prisma.problemSkill.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.classMembership.deleteMany();
  await prisma.class.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create test student
  const student = await prisma.user.create({
    data: {
      email: "student@mathquest.dev",
      name: "Alex Student",
      role: Role.STUDENT,
      passwordHash,
      studentProfile: {
        create: {
          currentPhase: Phase.FOUNDATIONS,
          xp: 0,
          level: 1,
          streak: 0,
        },
      },
    },
  });

  // Create test teacher
  const teacher = await prisma.user.create({
    data: {
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

  // Create a sample topic
  const topic = await prisma.topic.create({
    data: {
      phase: Phase.FOUNDATIONS,
      name: "Counting & Numbers",
      slug: "counting-and-numbers",
      description: "Learn to count, recognize numbers, and understand basic quantity.",
      order: 1,
    },
  });

  // Create skills for this topic
  const countingSkill = await prisma.skill.create({
    data: {
      topicId: topic.id,
      name: "Count to 10",
      slug: "count-to-10",
      description: "Count objects from 1 to 10",
    },
  });

  const additionSkill = await prisma.skill.create({
    data: {
      topicId: topic.id,
      name: "Simple Addition",
      slug: "simple-addition",
      description: "Add two single-digit numbers",
      prerequisites: { connect: [{ id: countingSkill.id }] },
    },
  });

  // Create 2 lessons
  const lesson1 = await prisma.lesson.create({
    data: {
      topicId: topic.id,
      title: "Counting Objects",
      slug: "counting-objects",
      description: "Learn to count everyday objects from 1 to 10.",
      order: 1,
      xpReward: 10,
      createdById: teacher.id,
      content: {
        blocks: [
          { type: "text", content: "# Counting Objects\n\nLet's learn to count! Look at the objects and count how many there are." },
          { type: "callout", variant: "tip", content: "Point to each object as you count it. This helps you keep track!" },
          {
            type: "example",
            title: "Counting Apples",
            content: "🍎 🍎 🍎\n\nHow many apples do you see?",
            solution: "There are **3** apples!",
          },
        ],
      },
    },
  });

  const lesson2 = await prisma.lesson.create({
    data: {
      topicId: topic.id,
      title: "Adding Small Numbers",
      slug: "adding-small-numbers",
      description: "Learn to add two small numbers together.",
      order: 2,
      xpReward: 15,
      createdById: teacher.id,
      content: {
        blocks: [
          { type: "text", content: "# Adding Numbers\n\nWhen we put two groups together, we can count how many there are in total. This is called **addition**!" },
          {
            type: "example",
            title: "Adding Apples",
            content: "🍎 🍎 + 🍎 = ?",
            solution: "2 + 1 = **3**",
          },
          { type: "callout", variant: "definition", content: "**Addition** means combining two or more groups and counting the total." },
        ],
      },
    },
  });

  // Create 5 problems
  const problem1 = await prisma.problem.create({
    data: {
      lessonId: lesson1.id,
      type: ProblemType.MULTIPLE_CHOICE,
      difficulty: 1,
      content: {
        question: "How many stars are there? ⭐ ⭐ ⭐ ⭐",
        options: ["3", "4", "5", "6"],
        correctIndex: 1,
        hints: ["Try pointing to each star as you count!"],
      },
      commonMistakes: {
        patterns: ["Miscounting by skipping or double-counting"],
      },
      solution: {
        steps: ["Point to each star: 1, 2, 3, 4", "There are 4 stars!"],
      },
      skills: { create: [{ skillId: countingSkill.id }] },
    },
  });

  const problem2 = await prisma.problem.create({
    data: {
      lessonId: lesson1.id,
      type: ProblemType.MULTIPLE_CHOICE,
      difficulty: 1,
      content: {
        question: "How many hearts? ❤️ ❤️ ❤️ ❤️ ❤️ ❤️",
        options: ["5", "6", "7", "8"],
        correctIndex: 1,
        hints: ["Count slowly — there are more than 5!"],
      },
      solution: {
        steps: ["Count each heart: 1, 2, 3, 4, 5, 6", "There are 6 hearts!"],
      },
      skills: { create: [{ skillId: countingSkill.id }] },
    },
  });

  const problem3 = await prisma.problem.create({
    data: {
      lessonId: lesson1.id,
      type: ProblemType.FREE_INPUT,
      difficulty: 2,
      content: {
        question: "Count the moons and type the number: 🌙 🌙 🌙 🌙 🌙 🌙 🌙",
        correctAnswer: "7",
        hints: ["Count each moon carefully!"],
      },
      solution: {
        steps: ["Count: 1, 2, 3, 4, 5, 6, 7", "The answer is 7"],
      },
      skills: { create: [{ skillId: countingSkill.id }] },
    },
  });

  const problem4 = await prisma.problem.create({
    data: {
      lessonId: lesson2.id,
      type: ProblemType.MULTIPLE_CHOICE,
      difficulty: 2,
      content: {
        question: "What is 2 + 3?",
        options: ["4", "5", "6", "7"],
        correctIndex: 1,
        hints: ["Hold up 2 fingers, then hold up 3 more. Count all your fingers!"],
      },
      commonMistakes: {
        patterns: ["Off-by-one: counting one of the addends as part of the sum"],
      },
      solution: {
        steps: ["Start with 2", "Count up 3 more: 3, 4, 5", "2 + 3 = 5"],
      },
      skills: { create: [{ skillId: additionSkill.id }] },
    },
  });

  const problem5 = await prisma.problem.create({
    data: {
      lessonId: lesson2.id,
      type: ProblemType.FREE_INPUT,
      difficulty: 3,
      content: {
        question: "What is 4 + 5?",
        correctAnswer: "9",
        hints: ["Try counting on from 4: 5, 6, 7, 8, 9"],
      },
      solution: {
        steps: ["Start at 4", "Count up 5 more: 5, 6, 7, 8, 9", "4 + 5 = 9"],
      },
      skills: { create: [{ skillId: additionSkill.id }] },
    },
  });

  console.log("✅ Seed complete:");
  console.log(`   - Users: ${student.name} (student), ${teacher.name} (teacher)`);
  console.log(`   - Topic: ${topic.name}`);
  console.log(`   - Lessons: ${lesson1.title}, ${lesson2.title}`);
  console.log(`   - Problems: 5 created`);
  console.log(`   - Skills: ${countingSkill.name}, ${additionSkill.name}`);
  console.log(`\n   Login: student@mathquest.dev / password123`);
  console.log(`   Login: teacher@mathquest.dev / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
