// seed script to create an admin and a verified member with profile
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.socialLink.deleteMany();

  const adminPass = await bcrypt.hash('adminpass', 10);
  const memberPass = await bcrypt.hash('memberpass', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      ref_code: 'ADMIN0001',
      status: 'approved',
      role: 'admin',
      passwordHash: adminPass
    }
  });

  const member = await prisma.user.create({
    data: {
      name: 'Verified Member',
      email: 'member@example.com',
      ref_code: 'MEMBER0001',
      status: 'approved',
      role: 'member',
      passwordHash: memberPass
    }
  });

  // create profile for member
  const profile = await prisma.profile.create({
    data: {
      userId: member.id,
      username: 'verified_user',
      bio: 'Hello, I am a verified member!',
      avatarUrl: '',
      themeColor: '#1a73e8',
      socialLinks: {
        create: [
          { platform: 'GitHub', url: 'https://github.com/example' },
          { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/example' }
        ]
      }
    },
    include: { socialLinks: true }
  });

  console.log({ admin, member, profile });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
