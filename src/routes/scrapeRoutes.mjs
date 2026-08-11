import { Router } from 'express';
import * as controller from '../controllers/scrapeController.mjs';
import asyncHandler from '../utils/asyncHandler.mjs';
import { validateBody } from '../middlewares/validate.mjs';
import { scrapeRequestSchema } from '../validators/scrapeValidators.mjs';

const router = Router();

router.post('/', validateBody(scrapeRequestSchema), asyncHandler(controller.scrape));
router.post('/flow', validateBody(scrapeRequestSchema), asyncHandler(controller.generateFlow));

export default router;
