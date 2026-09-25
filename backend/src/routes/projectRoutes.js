// Project URLs → /api/projects/...  (app.js already requires login for these)
import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';

const router = Router();
const canWrite = requirePermission('project:write');

router.get('/', listProjects);
router.post('/', canWrite, createProject);
router.get('/:id', getProject);
router.patch('/:id', canWrite, updateProject);
router.delete('/:id', canWrite, deleteProject);

export default router;
