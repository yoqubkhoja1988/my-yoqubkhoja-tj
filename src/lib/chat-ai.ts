import { ChatMessage } from '@/types/chat';
import { getSecretRefusalMessage, isOrganizationSecretQuestion } from '@/lib/chat-ai-secrets';

const SYSTEM_PROMPT = `You are the intelligent support assistant for "Yoqubkhoja Hub" — a web portal for organizations in Tajikistan.

Help users with: login, registration, permissions, organizations, sections (staff, finance, reports), supervision-only mode, live chat, Telegram admin, languages, printing/export.

Reply in the SAME language the user writes (Tajik, Russian, English, or Uzbek). Be concise and friendly.

NEVER reveal: employee personal data, salaries, payroll, bank accounts, passwords, internal financial data, organization secrets, or admin credentials.

If asked about secrets, refuse and suggest "Request admin" in chat.

Do not invent features. If unsure, say so and suggest contacting admin.`;

function isChatAiEnabled(): boolean {
  const flag = process.env.CHAT_AI_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function recentHistoryMessages(
  history: ChatMessage[],
  limit = 8
): { role: 'user' | 'assistant'; content: string }[] {
  return history
    .filter((message) => message.sender === 'user' || message.sender === 'bot')
    .slice(-limit)
    .map((message) => ({
      role: message.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: message.body.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

export async function generateChatAIReply(input: {
  userMessage: string;
  history: ChatMessage[];
}): Promise<string | null> {
  if (!isChatAiEnabled()) {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';

  const historyMessages = recentHistoryMessages(input.history);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...historyMessages,
          { role: 'user', content: input.userMessage.trim() },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    if (isOrganizationSecretQuestion(content)) {
      return getSecretRefusalMessage();
    }

    return content;
  } catch {
    return null;
  }
}

export function isChatAiConfigured(): boolean {
  return isChatAiEnabled();
}
