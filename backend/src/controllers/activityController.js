// Activity logic: the org's audit log, newest first.
import { prisma } from '../config/db.js';

export async function listActivity(req, res) {
  const activities = await prisma.activity.findMany({
    where: { orgId: req.user.orgId },
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ activities });
}
