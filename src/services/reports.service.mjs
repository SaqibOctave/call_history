import CallResult from '../config/call_result.enum.mjs';
import * as repo from '../repositories/reports.repository.mjs';

function todayWindow() {
  const now = new Date();

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  return { from, to, dateStr: toDateString(from) };
}

function yesterdayWindow() {
  const now = new Date();

  const from = new Date(now);
  from.setDate(from.getDate() - 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(now);
  to.setDate(to.getDate() - 1);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

function rollingWeekWindow() {
  const now = new Date();

  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);

  return { from, to };
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDaySlots(from, to) {
  const slots = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    slots.push(toDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return slots;
}

function resolveKind(kind) {
  if (kind !== 'pipeline' && kind !== 's2s') {
    throw new Error(`Invalid kind "${kind}". Must be "pipeline" or "s2s".`);
  }
  return kind;
}

export async function dashboardAgentStatus(kind) {
  resolveKind(kind);
  const row = await repo.agentStatus(kind);
  return {
    kind,
    active_agents:  row.active_agents,
    on_call_agents: row.on_call_agents,
  };
}

export async function dashboardInterruptionRate(kind) {
  resolveKind(kind);
  const { from, to, dateStr } = todayWindow();
  const row = await repo.callStatsInWindow(from, to, kind);

  const total  = row.total_calls;
  const failed = row.failed_calls;
  const rate   = total === 0 ? 0 : parseFloat(((failed / total) * 100).toFixed(2));

  return {
    kind,
    date:              dateStr,
    total_calls:       total,
    failed_calls:      failed,
    interruption_rate: rate,
  };
}

export async function dashboardCallsToday(kind) {
  resolveKind(kind);
  const { from: todayFrom, to: todayTo, dateStr } = todayWindow();
  const { from: yFrom, to: yTo }                  = yesterdayWindow();

  const [todayRow, yesterdayRow] = await Promise.all([
    repo.callStatsInWindow(todayFrom, todayTo, kind),
    repo.callStatsInWindow(yFrom, yTo, kind),
  ]);

  const todayCount     = todayRow.total_calls;
  const yesterdayCount = yesterdayRow.total_calls;

  const change_pct = yesterdayCount === 0
    ? null
    : parseFloat((((todayCount - yesterdayCount) / yesterdayCount) * 100).toFixed(2));

  return {
    kind,
    date:            dateStr,
    calls_today:     todayCount,
    calls_yesterday: yesterdayCount,
    change_pct,
    trend:           change_pct === null ? 'no_data' : change_pct >= 0 ? 'up' : 'down',
  };
}

export async function dashboardAvgLlmLatency(kind) {
  resolveKind(kind);
  const { from, to, dateStr } = todayWindow();
  const row = await repo.callStatsInWindow(from, to, kind);

  return {
    kind,
    date:            dateStr,
    total_calls:     row.total_calls,
    avg_llm_ttfb_ms: parseFloat(row.avg_llm_ttfb_ms.toFixed(2)),
  };
}

export async function weeklyConversationQuality() {
  const { from, to } = rollingWeekWindow();

  const row = await repo.conversationQualityInWindow(from, to);

  const total     = row.total_calls;
  const failed    = row.failed_calls;
  const completed = row.completed_calls;

  const pct = (n) => total === 0 ? 0 : parseFloat(((n / total) * 100).toFixed(2));

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total_calls:                  total,
    avg_turns_per_call:           parseFloat(row.avg_turns.toFixed(2)),
    calls_with_interruptions_pct: pct(failed),
    calls_without_interruptions_pct: pct(completed),
    avg_call_duration_seconds:    parseFloat(row.avg_duration_seconds.toFixed(2)),
  };
}

export async function weeklyCallsByAgent() {
  const { from, to } = rollingWeekWindow();

  const rows = await repo.callsByAgentInWindow(from, to);

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    agents: rows,
  };
}

export async function weeklyUsageTotals() {
  const { from, to } = rollingWeekWindow();

  const row = await repo.usageTotalsInWindow(from, to);

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total_tts_characters:    row.total_tts_characters,
    total_completion_tokens: row.total_completion_tokens,
    total_prompt_tokens:     row.total_prompt_tokens,
  };
}

export async function weeklyAvgLlmLatency() {
  const { from, to } = rollingWeekWindow();

  const row = await repo.avgLlmLatencyInWindow(from, to);

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total_calls:      row.total_calls,
    avg_llm_ttfb_ms: parseFloat(row.avg_llm_ttfb_ms.toFixed(2)),
  };
}

export async function weeklyAvgTtsLatency() {
  const { from, to } = rollingWeekWindow();

  const row = await repo.avgTtsLatencyInWindow(from, to);

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total_calls:       row.total_calls,
    avg_tts_ttfb_ms:  parseFloat(row.avg_tts_ttfb_ms.toFixed(2)),
  };
}

export async function weeklyInterruptionRate() {
  const { from, to } = rollingWeekWindow();

  const rows = await repo.callCountsByStatusInWindow(from, to);

  const countByStatus = Object.fromEntries(rows.map(r => [r.status, r.count]));

  const failed = countByStatus[CallResult.FAILED] ?? 0;
  const total  = rows.reduce((sum, r) => sum + r.count, 0);
  const rate   = total === 0 ? 0 : parseFloat(((failed / total) * 100).toFixed(2));

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total_calls:  total,
    failed_calls: failed,
    interruption_rate: rate,
  };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function weeklyCallsByDay() {
  const { from, to } = rollingWeekWindow();

  const rows = await repo.totalCallsInWindow(from, to);

  const countByDate = Object.fromEntries(
    rows.map(r => [toDateString(new Date(r.date)), r.count])
  );

  const todayStr = toDateString(new Date());

  return buildDaySlots(from, to).reverse().map(date => {
    const d = new Date(date + 'T00:00:00Z');
    return {
      date,
      day:   DAY_NAMES[d.getUTCDay()],
      today: date === todayStr,
      count: countByDate[date] ?? 0,
    };
  });
}

export async function weeklyTotalCalls() {
  const { from, to } = rollingWeekWindow();

  const rows = await repo.totalCallsInWindow(from, to);

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return {
    window: {
      from: toDateString(from),
      to:   toDateString(to),
    },
    total,
  };
}
