import { ChatConversation } from '@/types/chat';
import { getRelevantKnowledgeSnippets } from '@/lib/chat-bot';
import { resolveChatPageContext } from '@/lib/chat-page-context';

export type ChatAiSessionContext = {
  displayName: string;
  isLoggedIn: boolean;
  sourcePage?: string | null;
  sectionTitle: string | null;
  subSectionTitle: string | null;
  pageHint: string | null;
  greetingNote: string;
  knowledgeSnippets: string[];
};

export function buildChatAiSessionContext(
  conversation: Pick<ChatConversation, 'displayName' | 'userId' | 'sourcePage'> | undefined,
  userMessage: string
): ChatAiSessionContext {
  const displayName = conversation?.displayName?.trim() || 'Меҳмон';
  const isLoggedIn = Boolean(conversation?.userId);
  const sourcePage = conversation?.sourcePage ?? null;
  const page = resolveChatPageContext(sourcePage);

  return {
    displayName,
    isLoggedIn,
    sourcePage,
    sectionTitle: page.sectionTitle,
    subSectionTitle: page.subSectionTitle,
    pageHint: page.pageHint,
    greetingNote: page.greetingNote,
    knowledgeSnippets: getRelevantKnowledgeSnippets(userMessage, 3),
  };
}

export function getPageGreetingNote(sourcePage?: string | null): string {
  return resolveChatPageContext(sourcePage).greetingNote;
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
  if (context.sectionTitle) {
    lines.push(`Section: ${context.sectionTitle}`);
  }
  if (context.subSectionTitle) {
    lines.push(`Sub-section: ${context.subSectionTitle}`);
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
