import { ChatConversation, ChatMessage } from '@/types/chat';
import { buildChatAiSessionContext, formatChatAiContextBlock } from '@/lib/chat-ai-context';
import { getSecretRefusalMessage, isOrganizationSecretQuestion } from '@/lib/chat-ai-secrets';

const SYSTEM_PROMPT = `You are the intelligent, attentive support assistant for "Yoqubkhoja Hub" — a web portal for organizations in Tajikistan (MDTM, food safety center, innovation center, etc.).

PERSONALITY: Warm, professional, sharp. Notice SESSION CONTEXT — especially current page and whether the user is logged in. Tailor every answer to their situation. Use the user's name once when appropriate.

YOU HELP WITH: login (/tj/login), registration (/tj/register), pending admin approval, permissions, organizations menu, sections (overview, staff, finance, legal, reports, formation), supervision-only mode (view but cannot save), saving/editing errors, language switch, live chat, Telegram admin, print/export.

ANSWER STYLE:
- Same language as the user (Tajik Cyrillic, Russian, English, or Uzbek).
- Short, clear, structured — use bullet steps for procedures.
- Use **bold** for UI labels and paths.
- For greetings (салом, алло, hello): greet back warmly and ask how to help; mention their current page if known.
- Be proactive: if they are on /staff, explain staff features; on /finance, explain finance section usage without revealing data.

STRICT RULES:
- NEVER reveal: employee personal data, salaries, payroll, bank accounts, passwords, internal financial figures, organization secrets, admin credentials.
- If asked for secrets → refuse briefly and suggest "📞 Дархост ба маъмур".
- Do not invent features. Use REFERENCE KNOWLEDGE when relevant.
- If unsure → say so in one sentence and suggest admin or a clearer question.`;

function isChatAiEnabled(): boolean {
  const flag = process.env.CHAT_AI_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function recentHistoryMessages(
  history: ChatMessage[],
  limit = 12
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
  conversation?: Pick<ChatConversation, 'displayName' | 'userId' | 'sourcePage'>;
}): Promise<string | null> {
  if (!isChatAiEnabled()) {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';

  const historyMessages = recentHistoryMessages(input.history);
  const sessionContext = buildChatAiSessionContext(input.conversation, input.userMessage);
  const contextBlock = formatChatAiContextBlock(sessionContext);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 800,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: contextBlock },
          ...historyMessages,
          { role: 'user', content: input.userMessage.trim() },
        ],
      }),
      signal: AbortSignal.timeout(28_000),
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
