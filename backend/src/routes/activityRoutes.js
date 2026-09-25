// Activity URLs → /api/activity  (app.js already requires login for these)
import { Router } from 'express';
import { listActivity } from '../controllers/activityController.js';

const router = Router();

router.get('/', listActivity);

export default router;
