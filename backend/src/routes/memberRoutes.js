// Member URLs → /api/members/...  (app.js already requires login for these)
import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware.js';
import { listMembers, changeRole, removeMember } from '../controllers/memberController.js';

const router = Router();

router.get('/', listMembers);
router.patch('/:userId', requirePermission('member:manage'), changeRole);
router.delete('/:userId', requirePermission('member:manage'), removeMember);

export default router;
