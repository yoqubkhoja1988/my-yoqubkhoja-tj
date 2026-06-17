import { ChatConversation, ChatMessage } from '@/types/chat';
import { buildChatAiSessionContext, formatChatAiContextBlock } from '@/lib/chat-ai-context';
import { ChatUserLanguage, getChatLanguageLabel } from '@/lib/chat-language';
import { getSecretRefusalMessage, isOrganizationSecretQuestion } from '@/lib/chat-ai-secrets';

const SYSTEM_PROMPT = `You are the intelligent, attentive support assistant for "Yoqubkhoja Hub" — a web portal for organizations in Tajikistan (MDTM, food safety center, innovation center, etc.).

PERSONALITY: Warm, professional, sharp. Notice SESSION CONTEXT — especially current page and whether the user is logged in. Tailor every answer to their situation. Use the user's name once when appropriate.

YOU HELP WITH: login (/tj/login), registration (/tj/register), pending admin approval, permissions, organizations menu, sections (overview, staff, finance, legal, reports, formation), supervision-only mode (view but cannot save), saving/editing errors, language switch, live chat, Telegram admin, print/export.

LANGUAGE (CRITICAL):
- Always reply in the user's language specified in the next system message.
- Supported: Tajik, Russian, English, Uzbek.
- SESSION CONTEXT may be written in Tajik — translate it naturally into the user's language.
- UI button names may stay as in the app when helpful.

ANSWER STYLE:
- Short, clear, structured — use bullet steps for procedures.
- Use **bold** for UI labels and paths.
- For greetings: greet back warmly and ask how to help; mention their current page if known.
- Be proactive: tailor answers to the current SECTION and SUB-SECTION from SESSION CONTEXT.

STRICT RULES:
- NEVER reveal: employee personal data, salaries, payroll, bank accounts, passwords, internal financial figures, organization secrets, admin credentials.
- If asked for secrets → refuse briefly and suggest the admin request button in the user's language.
- Do not invent features. Use REFERENCE KNOWLEDGE when relevant.
- If unsure → say so in one sentence and suggest admin or a clearer question.`;

let lastChatAiError: string | null = null;

export function getLastChatAiError(): string | null {
  return lastChatAiError;
}

function isChatAiEnabled(): boolean {
  const flag = process.env.CHAT_AI_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function probeChatAi(): Promise<{ ok: boolean; error: string | null }> {
  if (!isChatAiEnabled()) {
    return { ok: false, error: 'missing_api_key' };
  }

  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const model = process.env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      const error = `http_${response.status}`;
      lastChatAiError = error;
      console.error('[chat-ai] probe failed', response.status, errorBody.slice(0, 200));
      return { ok: false, error };
    }

    lastChatAiError = null;
    return { ok: true, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'network_error';
    lastChatAiError = message;
    console.error('[chat-ai] probe failed', error);
    return { ok: false, error: message };
  }
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
  userLanguage?: ChatUserLanguage;
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
  const language = input.userLanguage ?? 'tj';
  const languageBlock = `USER LANGUAGE: ${getChatLanguageLabel(language)}. Reply ONLY in ${getChatLanguageLabel(language)}.`;

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
          { role: 'system', content: languageBlock },
          { role: 'system', content: contextBlock },
          ...historyMessages,
          { role: 'user', content: input.userMessage.trim() },
        ],
      }),
      signal: AbortSignal.timeout(28_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      lastChatAiError = `http_${response.status}`;
      console.error('[chat-ai] OpenAI error', response.status, errorBody.slice(0, 300));
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      lastChatAiError = 'empty_response';
      return null;
    }

    lastChatAiError = null;

    if (isOrganizationSecretQuestion(content)) {
      return getSecretRefusalMessage(language);
    }

    return content;
  } catch (error) {
    lastChatAiError = error instanceof Error ? error.message : 'network_error';
    console.error('[chat-ai] request failed', error);
    return null;
  }
}

export function isChatAiConfigured(): boolean {
  return isChatAiEnabled();
}
