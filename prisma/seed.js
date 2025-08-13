import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with 5 users...');

  const usersData = [
    { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob Smith', email: 'bob@example.com', password: 'password123' },
    { name: 'Charlie Davis', email: 'charlie@example.com', password: 'password123' },
    { name: 'Diana Brown', email: 'diana@example.com', password: 'password123' },
    { name: 'Ethan Williams', email: 'ethan@example.com', password: 'password123' },
  ];

  for (const u of usersData) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashed,
      },
    });
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
