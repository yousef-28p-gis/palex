const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 12);
  const user = await prisma.user.update({
    where: { email: 'you5@hotmail.com' },
    data: { passwordHash: hashedPassword }
  });
  console.log('Password updated for user:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
