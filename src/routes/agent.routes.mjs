
import { Router } from 'express';
import * as controller from '../controllers/agent.controller.mjs';

const router = Router();

router.get('/',       controller.getAllAgents);
router.get('/:id',    controller.getAgentById);

export default router;