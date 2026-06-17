import { ChatConversation } from '@/types/chat';
import { getRelevantKnowledgeSnippets } from '@/lib/chat-bot';

type PageHint = {
  pattern: RegExp;
  section: string;
  hint: string;
};

const PAGE_HINTS: PageHint[] = [
  {
    pattern: /\/login\/?$/i,
    section: 'login',
    hint: 'Корбар дар саҳифаи вуруд аст — дар бораи номи вуруд, рамз ва мушкилоти вуруд кӯмак кун.',
  },
  {
    pattern: /\/register\/?$/i,
    section: 'register',
    hint: 'Корбар дар саҳифаи сабти ном аст — дар бораи сабт, тасдиқи маъмур ва интизори иҷозат кӯмак кун.',
  },
  {
    pattern: /\/organizations\/?$/i,
    section: 'organizations',
    hint: 'Корбар рӯйхати ташкилотҳоро мебинад — агар ташкилот намоиш дода нашавад, иҷозатро шарҳ деҳ.',
  },
  {
    pattern: /\/organizations\/[^/]+\/staff/i,
    section: 'staff',
    hint: 'Корбар дар бахши «Кормандон ва кадрҳо» аст — ҷадвали штат, вакансия, ҳузур, реестр. Маълумоти шахсии кормандон/музд махфӣ аст.',
  },
  {
    pattern: /\/organizations\/[^/]+\/finance/i,
    section: 'finance',
    hint: 'Корбар дар бахши молия/муҳосибот аст — ҳисобот, захира, режими назорат. Рақамҳои дохилии молия махфӣ аст.',
  },
  {
    pattern: /\/organizations\/[^/]+\/formation-report/i,
    section: 'formation',
    hint: 'Корбар дар бахши ҳисоботи ташкилӣ аст — дар бораи пур кардан ва чоп/экспорт кӯмак кун.',
  },
  {
    pattern: /\/organizations\/[^/]+\/reports/i,
    section: 'reports',
    hint: 'Корбар дар бахши ҳисоботҳо аст.',
  },
  {
    pattern: /\/organizations\/[^/]+\/legal/i,
    section: 'legal',
    hint: 'Корбар дар бахши ҳуқуқӣ/ҳуҷҷатҳои расмӣ аст.',
  },
  {
    pattern: /\/organizations\/[^/]+\/overview/i,
    section: 'overview',
    hint: 'Корбар дар саҳифаи умумии ташкилот аст — менюи чап ва бахшҳоро шарҳ деҳ.',
  },
  {
    pattern: /\/organizations\/[^/]+/i,
    section: 'organization',
    hint: 'Корбар дар саҳифаи ташкилот аст — менюи чап, бахшҳои дастрас ва иҷозатҳоро шарҳ деҳ.',
  },
  {
    pattern: /\/dashboard/i,
    section: 'dashboard',
    hint: 'Корбар дар панели лоиҳаҳо (Dashboard) аст.',
  },
];

function resolvePageHint(sourcePage?: string | null): string | null {
  if (!sourcePage?.trim()) return null;
  const path = sourcePage.trim();
  for (const entry of PAGE_HINTS) {
    if (entry.pattern.test(path)) {
      return entry.hint;
    }
  }
  return `Корбар дар саҳифаи «${path}» аст — ҷавобро ба ин контекст мувофиқ кун.`;
}

export type ChatAiSessionContext = {
  displayName: string;
  isLoggedIn: boolean;
  sourcePage?: string | null;
  pageHint: string | null;
  knowledgeSnippets: string[];
};

export function buildChatAiSessionContext(
  conversation: Pick<ChatConversation, 'displayName' | 'userId' | 'sourcePage'> | undefined,
  userMessage: string
): ChatAiSessionContext {
  const displayName = conversation?.displayName?.trim() || 'Меҳмон';
  const isLoggedIn = Boolean(conversation?.userId);
  const sourcePage = conversation?.sourcePage ?? null;
  const pageHint = resolvePageHint(sourcePage);

  return {
    displayName,
    isLoggedIn,
    sourcePage,
    pageHint,
    knowledgeSnippets: getRelevantKnowledgeSnippets(userMessage, 3),
  };
}

export function formatChatAiContextBlock(context: ChatAiSessionContext): string {
  const lines: string[] = ['--- SESSION CONTEXT ---'];

  lines.push(
    context.isLoggedIn
      ? `User: ${context.displayName} (logged in)`
      : `User: ${context.displayName} (guest, not logged in)`
  );

  if (context.sourcePage) {
    lines.push(`Current page: ${context.sourcePage}`);
  }
  if (context.pageHint) {
    lines.push(`Page guidance: ${context.pageHint}`);
  }

  if (context.knowledgeSnippets.length > 0) {
    lines.push('', '--- REFERENCE KNOWLEDGE (facts; rephrase naturally, do not copy verbatim) ---');
    context.knowledgeSnippets.forEach((snippet, index) => {
      lines.push(`${index + 1}. ${snippet.replace(/\n/g, ' ')}`);
    });
  }

  return lines.join('\n');
}
