// Demo data: one org with an admin, a member and a viewer, plus a second org to test isolation.
// Run with `npm run db:seed`. Every demo password is "password123".
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const acme = await createOrg('Acme Inc', [
    { name: 'Ada Admin', email: 'admin@acme.test', role: 'ADMIN' },
    { name: 'Max Member', email: 'member@acme.test', role: 'MEMBER' },
    { name: 'Vera Viewer', email: 'viewer@acme.test', role: 'VIEWER' },
  ]);
  // A second tenant, so you can check that Acme users can never see Globex data.
  await createOrg('Globex', [{ name: 'Gus Globex', email: 'admin@globex.test', role: 'ADMIN' }]);

  const [ada, max] = acme.users;
  const engineering = await prisma.team.create({ data: { orgId: acme.org.id, name: 'Engineering' } });
  await prisma.team.create({ data: { orgId: acme.org.id, name: 'Design' } });
  await prisma.teamMember.createMany({
    data: [
      { teamId: engineering.id, userId: ada.id },
      { teamId: engineering.id, userId: max.id },
    ],
  });

  const project = await prisma.project.create({
    data: {
      orgId: acme.org.id,
      teamId: engineering.id,
      name: 'Website relaunch',
      description: 'New marketing site and docs.',
    },
  });

  const columns = {
    TODO: ['Write pricing page copy', 'Set up analytics', 'Accessibility audit'],
    IN_PROGRESS: ['Build landing page hero', 'Migrate docs to new theme'],
    DONE: ['Pick a font pairing'],
  };
  for (const [status, titles] of Object.entries(columns)) {
    await prisma.task.createMany({
      data: titles.map((title, position) => ({
        orgId: acme.org.id,
        projectId: project.id,
        title,
        status,
        position,
        priority: ['HIGH', 'MEDIUM', 'LOW'][position % 3],
        assigneeId: position % 2 === 0 ? max.id : ada.id,
      })),
    });
  }

  console.log('Seeded. Log in as admin@acme.test / member@acme.test / viewer@acme.test (password123)');

  // Creates an org and its users with the given roles.
  async function createOrg(name, people) {
    const org = await prisma.organization.create({ data: { name } });
    const users = [];
    for (const person of people) {
      const user = await prisma.user.create({ data: { name: person.name, email: person.email, passwordHash } });
      await prisma.orgMember.create({ data: { userId: user.id, orgId: org.id, role: person.role } });
      users.push(user);
    }
    return { org, users };
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
