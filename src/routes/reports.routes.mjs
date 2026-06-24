import { Router } from 'express';
import * as controller from '../controllers/reports.controller.mjs';

const router = Router();

router.get('/dashboard/agent-status',      controller.getDashboardAgentStatus);
router.get('/dashboard/interruption-rate', controller.getDashboardInterruptionRate);
router.get('/dashboard/calls-today',       controller.getDashboardCallsToday);
router.get('/dashboard/avg-llm-latency',   controller.getDashboardAvgLlmLatency);

router.get('/weekly/total-calls',      controller.getWeeklyTotalCalls);
router.get('/weekly/by-day',           controller.getWeeklyCallsByDay);
router.get('/weekly/interruption-rate',  controller.getWeeklyInterruptionRate);
router.get('/weekly/avg-tts-latency',    controller.getWeeklyAvgTtsLatency);
router.get('/weekly/avg-llm-latency',    controller.getWeeklyAvgLlmLatency);
router.get('/weekly/usage-totals',       controller.getWeeklyUsageTotals);
router.get('/weekly/calls-by-agent',        controller.getWeeklyCallsByAgent);
router.get('/weekly/conversation-quality',  controller.getWeeklyConversationQuality);

export default router;
