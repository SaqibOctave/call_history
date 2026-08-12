
import { Router } from 'express';
import * as controller from '../controllers/agent.controller.mjs';
import { validateBody } from '../middlewares/validate.mjs';
import { createAgentSchema } from '../validators/agentValidators.mjs';

const router = Router();

router.get('/',       controller.getAllAgents);
router.get('/:id',    controller.getAgentById);
router.post('/',      validateBody(createAgentSchema), controller.createAgent);

export default router;