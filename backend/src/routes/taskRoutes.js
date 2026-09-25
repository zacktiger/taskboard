// Task URLs. Mounted at /api because they live under both /projects/:id/tasks and /tasks/:id.
// (app.js already requires login for these)
import { Router } from 'express';
import { requirePermission } from '../middleware/authMiddleware.js';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
} from '../controllers/taskController.js';

const router = Router();
const canWrite = requirePermission('task:write');

router.get('/projects/:projectId/tasks', listTasks);
router.post('/projects/:projectId/tasks', canWrite, createTask);
router.patch('/tasks/:id', canWrite, updateTask);
router.delete('/tasks/:id', canWrite, deleteTask);
router.patch('/tasks/:id/move', canWrite, moveTask);

export default router;
