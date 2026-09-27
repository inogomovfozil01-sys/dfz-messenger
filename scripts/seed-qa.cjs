const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
(async () => {
  if (!process.env.DATABASE_URL?.includes('127.0.0.1:5432/dfz_rebuild_qa')) throw Error('Dedicated local QA database required');
  const p = new PrismaClient();
  const passwordHash = await bcrypt.hash('LocalQaPassword2026!', 12);
  for (const [username, displayName, role] of [['qa_alice','QA Alice','USER'],['qa_bob','QA Bob','USER'],['qa_admin','QA Admin','ADMIN']]) {
    await p.user.upsert({where:{username},update:{},create:{username,role,profile:{create:{displayName}},credential:{create:{passwordHash}}}});
  }
  await p.$disconnect();
  console.log('Local QA accounts ready');
})();
