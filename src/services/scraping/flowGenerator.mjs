import { getOpenAIClient } from '../../config/openaiClient.mjs';
import env from '../../config/env.mjs';
import AppError from '../../utils/AppError.mjs';

// Only the prose (system persona + greeting) is LLM-generated. The flow's node/edge
// structure is fixed below, so a bad completion can't produce an invalid flow shape.
async function summarizeForAgent({ url, content }) {
  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: env.openai.model,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You turn scraped webpage text into source material for a voice FAQ agent. ' +
          'Respond with strict JSON: {"knowledge": string, "greeting_instruction": string}. ' +
          `"knowledge" is a concise, factual summary (under ${env.flow.summaryWordLimit} words, plain ` +
          'prose) the agent can rely on to answer questions accurately — who the company/site is, ' +
          'what they do, and any contact details present. "greeting_instruction" is one sentence ' +
          'telling the agent how to open the conversation for this specific page.',
      },
      {
        role: 'user',
        content: `Page URL: ${url}\n\nScraped content:\n${content}`,
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content);
  if (!parsed.knowledge || !parsed.greeting_instruction) {
    throw new AppError('OpenAI response was missing required fields', 502);
  }

  return parsed;
}

function buildFlow({ url, siteName, flowTitle, knowledge, greetingInstruction }) {
  return {
    $id: 'https://flows.pipecat.ai/schema/flow.json',
    meta: { name: flowTitle, version: '0.1.0' },
    nodes: [
      {
        id: 'initial',
        type: 'initial',
        position: { x: 100, y: 100 },
        data: {
          label: 'Initial',
          role_messages: [
            {
              role: 'system',
              content:
                `You are a helpful assistant answering questions about ${siteName}, based on the ` +
                `following information:\n\n${knowledge}\n\nSource: ${url}\n\n` +
                "If asked something not covered by this information, say you don't have that " +
                'detail rather than guessing, and offer to have someone follow up. Keep answers ' +
                'concise and conversational.\n\n' +
                'Answer ONLY the specific piece of information the user asked about — do not ' +
                "volunteer additional details they didn't request, even if related information " +
                'is available to you.\n\n' +
                'For example:\n' +
                '- If the user asks for contact info, give only the relevant contact details ' +
                '(e.g. phone number if they ask "what\'s your number", or email if they ask ' +
                '"how can I email you"). Don\'t list every phone number, email, and social media ' +
                'handle unless they ask for "all your contact information" or similar.\n' +
                '- If the user asks about one specific topic, don\'t also explain unrelated ' +
                'details unless asked.\n\n' +
                'Give the shortest complete answer to exactly what was asked. If the ' +
                `user's question is broad (e.g. "tell me about ${siteName}" or "how can I reach ` +
                'you"), then a fuller answer is appropriate — but for narrow, specific questions, ' +
                'stay narrow.',
            },
          ],
          task_messages: [
            {
              role: 'system',
              content:
                `${greetingInstruction}\n` +
                "Respond directly and specifically to what the user just asked — don't restate " +
                'the full FAQ or company overview.',
            },
          ],
          functions: [
            {
              name: 'end_conversation',
              description: 'User is done asking questions and wants to end the conversation',
              properties: {
                proceed: {
                  type: 'boolean',
                  description: 'Set to true once the user indicates they are finished',
                },
              },
              required: ['proceed'],
              next_node_id: 'end',
            },
          ],
          type: 'initial',
        },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 400, y: 100 },
        data: {
          label: 'End',
          task_messages: [{ role: 'system', content: 'Thank the user and end the conversation politely.' }],
          post_actions: [{ type: 'end_conversation' }],
          type: 'end',
        },
      },
    ],
    edges: [
      {
        id: 'func-initial-end_conversation-end',
        source: 'initial',
        target: 'end',
        label: 'end_conversation',
      },
    ],
  };
}

export async function generateFlow({ url, content }) {
  if (!content || !content.trim()) {
    throw new AppError('No content was extracted from the page to build a flow from', 422);
  }

  const siteName = new URL(url).hostname.replace(/^www\./, '');
  const trimmedContent = content.slice(0, env.flow.maxContentChars).trim();

  let knowledge;
  let greetingInstruction;

  if (env.flow.contentMode === 'full') {
    knowledge = trimmedContent;
    greetingInstruction = `Greet the caller and ask how you can help with questions about ${siteName}.`;
  } else {
    ({ knowledge, greeting_instruction: greetingInstruction } = await summarizeForAgent({
      url,
      content: trimmedContent,
    }));
  }

  return buildFlow({ url, siteName, flowTitle: `${siteName} FAQ`, knowledge, greetingInstruction });
}
