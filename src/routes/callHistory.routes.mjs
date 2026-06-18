import { Router } from 'express';
import * as controller from '../controllers/callHistory.controller.mjs';

const router = Router();

router.post('/',    controller.createCall);
router.get('/',     controller.getAllCalls);
router.get('/:id',  controller.getCallById);

export default router;
