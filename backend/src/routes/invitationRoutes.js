// Invitation URLs → /api/invitations/...
// Accepting a link is public (the link is the proof); everything else is admin-only.
import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';
import {
  listInvitations,
  createInvitation,
  revokeInvitation,
  acceptInvitation,
} from '../controllers/invitationController.js';

const router = Router();
const adminOnly = [requireAuth, requirePermission('member:manage')];

router.get('/', adminOnly, listInvitations);
router.post('/', adminOnly, createInvitation);
router.delete('/:id', adminOnly, revokeInvitation);
router.post('/:token/accept', acceptInvitation);

export default router;
