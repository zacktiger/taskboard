// Team URLs → /api/teams/...  (app.js already requires login for these)
import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware.js';
import {
  listTeams,
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '../controllers/teamController.js';

const router = Router();
const canManage = requirePermission('team:manage');

router.get('/', listTeams);
router.post('/', canManage, createTeam);
router.delete('/:id', canManage, deleteTeam);
router.post('/:id/members', canManage, addTeamMember);
router.delete('/:id/members/:userId', canManage, removeTeamMember);

export default router;
