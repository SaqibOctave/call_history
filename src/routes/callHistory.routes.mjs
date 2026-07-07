import { Router } from 'express';
import * as controller from '../controllers/callHistory.controller.mjs';

const router = Router();

// Call history is read-only here: pipecat-flows is the single writer of call
// stats (agent_stats / sts_agent_stats), surfaced via the "Call_History" view.
// The former POST/DELETE ingestion endpoints wrote a standalone table that no
// longer exists, so they've been removed.
router.get('/',    controller.getAllCalls);
router.get('/:id', controller.getCallById);

export default router;
