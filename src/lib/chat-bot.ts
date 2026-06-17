import { ChatConversation, ChatMessage } from '@/types/chat';
import { getPageGreetingNote } from '@/lib/chat-ai-context';
import { getSecretRefusalMessage, isOrganizationSecretQuestion } from '@/lib/chat-ai-secrets';
import { generateChatAIReply, isChatAiConfigured } from '@/lib/chat-ai';
import {
  ChatUserLanguage,
  detectChatUserLanguage,
  normalizeAppLocale,
  shouldUseTajikKnowledgeBase,
} from '@/lib/chat-language';

export type BotReply = {
  body: string;
  escalate?: boolean;
};

export type QuickTopic = {
  id: string;
  label: string;
  message: string;
};

type KnowledgeEntry = {
  id: string;
  keywords: string[];
  reply: string;
  priority?: number;
};

const ESCALATION_PHRASES = [
  'маъмури сомона',
  'ба маъмур',
  'даъват кун',
  'даъват кунед',
  'оператор',
  'operator',
  'живой человек',
  'инсон лозим',
  'manager',
  'support agent',
  'связаться с админ',
  'админ лозим',
  'админро',
  'админро даъват',
];

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'welcome',
    keywords: [
      'салом',
      'ассалом',
      'hello',
      'hi',
      'привет',
      'даром',
      'shumo',
      'алло',
      'ало',
      'allo',
      'салам',
      'salom',
      'assalom',
      'hey',
      'эй',
    ],
    reply:
      'Салом! 👋 Ман ёрдамчии зеҳни сунъии барнома ҳастам.\n\n' +
      'Ман дар бораи инҳо ҷавоб медиҳам:\n' +
      '• вуруд ва сабти ном\n' +
      '• ташкилотҳо ва бахшҳо\n' +
      '• иҷозатҳо ва режими назорат\n' +
      '• чат ва Telegram\n\n' +
      'Саволро озодона нависед.',
    priority: 1,
  },
  {
    id: 'login',
    keywords: [
      'вуруд',
      'ворид',
      'login',
      'log in',
      'sign in',
      'номи вуруд',
      'username',
      'рамз',
      'парол',
      'password',
      'чӣ тавр ворид',
      'чӣ гуна ворид',
      'намеварад',
      'вуруд намешавад',
      'invalid',
      'credentials',
    ],
    reply:
      '📌 **Чӣ тавр ворид шавем?**\n\n' +
      '1. Ба саҳифаи **Вуруд** (/tj/login) равед\n' +
      '2. **Номи вуруд** ва **Рамз**-ро нависед\n' +
      '3. Тугмаи «Ворид шудан»-ро пахш кунед\n\n' +
      '⚠️ Агар ҳисоби нав сабт карда бошед — то тасдиқи маъмур вуруд имконнопазир аст.\n' +
      '⚠️ Агар «Дастрасӣ баста шудааст» — бо маъмур тамос гиред.',
    priority: 3,
  },
  {
    id: 'register',
    keywords: [
      'сабт',
      'сабти ном',
      'register',
      'registration',
      'номнавис',
      'регистра',
      'ҳисоб',
      'аккаунт',
      'account',
      'чӣ тавр сабт',
      'чӣ гуна сабт',
    ],
    reply:
      '📌 **Чӣ тавр сабти ном кунем?**\n\n' +
      '1. Ба **Сабти ном** (/tj/register) равед\n' +
      '2. Номи вуруд (ҳадди ақал 3 аломат) ва рамз (ҳадди ақал 6 аломат) гузоред\n' +
      '3. Рамзро такрор кунед\n' +
      '4. «Сабт кардан»-ро пахш кунед\n\n' +
      'Пас аз сабт маъмури сомона иҷозат медиҳад. То он вақт вуруд имконнопазир аст.',
    priority: 3,
  },
  {
    id: 'pending',
    keywords: [
      'интизор',
      'тасдиқ',
      'pending',
      'approval',
      'иҷозат дода нашуд',
      'hanӯz',
      'hanuz',
      'на тасдиқ',
      'интизори иҷозат',
    ],
    reply:
      '⏳ **Интизори иҷозат**\n\n' +
      'Пас аз сабти ном ҳисоби шумо дар ҳолати «Интизори иҷозат» мемонад.\n' +
      'Маъмури сомона бояд иҷозат диҳад — баъд метавонед ворид шавед.\n\n' +
      'Агар интизорӣ дароз шуд — «Дархост ба маъмур»-ро дар чат пахш кунед.',
    priority: 3,
  },
  {
    id: 'permissions',
    keywords: [
      'иҷозат',
      'доступ',
      'access',
      'permission',
      'иҷозатҳо',
      'дастрасӣ',
      'баста шуда',
      'denied',
      'намеояд',
      'наме бинam',
    ],
    reply:
      '🔐 **Иҷозатҳо**\n\n' +
      'Маъмури сомона барои ҳар корбар муайян мекунад:\n' +
      '• кадом **ташкилот** дастрас аст\n' +
      '• кадом **бахшҳо** дастрасанд\n' +
      '• оё **лоиҳаҳо** дастрасанд\n' +
      '• режими **«Танҳо назорат»** ё иҷрои пурра\n\n' +
      'Пас аз тағйири иҷозатҳо саҳифаро нав кунед — дастрасии нав намоиш дода мешавад.',
    priority: 3,
  },
  {
    id: 'supervision',
    keywords: [
      'назорат',
      'supervision',
      'танҳо назорат',
      'supervision only',
      'бе иҷро',
      'намефиристам',
      'захира',
      'save',
      'тағйир',
      'edit',
      'мамнуъ',
    ],
    reply:
      '👁 **Режими «Танҳо назорат»**\n\n' +
      'Дар ин режим шумо **ҳама бахшҳо**-ро мебинед, аммо:\n' +
      '❌ тағйир додан\n' +
      '❌ захира кардан\n' +
      '❌ нест кардан\n\n' +
      'Барои иҷозати тағйир — ба маъмури сомона муроҷиат кунед.',
    priority: 3,
  },
  {
    id: 'organizations',
    keywords: [
      'ташкилот',
      'organization',
      'муассиса',
      'мдтм',
      'кӯдаkiston',
      'кудakiston',
      'бехатарӣ',
      'озуқаворӣ',
      'марказ',
      'organizations',
      'ба ташкилот',
      'чӣ тавр ташкилот',
    ],
    reply:
      '🏢 **Ташкилотҳо**\n\n' +
      '1. Дар меню **«Ташкилотҳо»**-ро пахш кунед\n' +
      '2. Ташкилоти иҷозатдодашударо интихоб кунед\n' +
      '3. Аз менюи чап бахши лозимро кушоед\n\n' +
      'Агар ташкилотро намебинед — маъмур иҷозат дода накардааст.',
    priority: 3,
  },
  {
    id: 'sections',
    keywords: [
      'бахш',
      'section',
      'меню',
      'menu',
      'навигат',
      'кушодан',
      'чӣ тавр кушоям',
      'чӣ гуна кушоям',
      'ҳисобот',
      'report',
      'formation',
    ],
    reply:
      '📂 **Бахшҳо**\n\n' +
      'Дар саҳифаи ташкилот аз менюи чап бахшро интихоб кунед:\n' +
      '• **Умумӣ**, **Кадр**, **Молия**, **Ҳисобот** ва дигарон\n\n' +
      'Танҳо бахшҳои иҷозатдодашуда намоиш дода мешаванд.',
    priority: 2,
  },
  {
    id: 'staff',
    keywords: [
      'кадр',
      'корманд',
      'staff',
      'штат',
      'кормандон',
      'вазифа',
      'деража',
      'чӣ тавр кадр',
      'чӣ гуна кадр',
    ],
    reply:
      '👥 **Кормандон ва кадрҳо**\n\n' +
      '1. Ташкилотро кушоед\n' +
      '2. Бахши **«Кормандон ва кадрҳо»**-ро интихоб кунед\n' +
      '3. Ҷадвали штат ва вазифаҳоро бинед\n\n' +
      'Маълумоти шахсии кормандон ё музди онҳо махфӣ аст — ман наметавонам ошкор кунам.',
    priority: 3,
  },
  {
    id: 'finance',
    keywords: [
      'молия',
      'finance',
      'муҳосибот',
      'accounting',
      'пардохт',
      'payment',
      'банк',
      'bank',
      'бюджет',
      'budget',
      'хароҷот',
      'чӣ тавр молия',
    ],
    reply:
      '💰 **Молия ва муҳосибот**\n\n' +
      '1. Ташкилот → **«Муҳосибот ва молия»**\n' +
      '2. Маълумоти молиявӣ ва ҳисоботро бинед (агар иҷозат дошта бошед)\n' +
      '3. Барои захира — иҷозати иҷро лозим (на «танҳо назорат»)\n\n' +
      'Маълумоти молиявии дохилии ташкилот махфӣ аст.',
    priority: 3,
  },
  {
    id: 'language',
    keywords: ['забон', 'language', 'lang', 'русӣ', 'англисӣ', 'тоҷикӣ', 'ӯзбекӣ', 'uz', 'ru', 'en', 'tj'],
    reply:
      '🌐 **Забон**\n\nДар болои саҳифа **«Забон»**-ро пахш кунед. Дастрас: тоҷикӣ, русӣ, англисӣ, ӯзбекӣ.',
    priority: 2,
  },
  {
    id: 'logout',
    keywords: ['баромад', 'logout', 'sign out', 'хориҷ', 'баромадан'],
    reply: '🚪 **Баромад**\n\nДар болои саҳифа тугмаи **«Баромад»**-ро пахш кунед.',
    priority: 2,
  },
  {
    id: 'dashboard',
    keywords: ['лоиҳа', 'project', 'dashboard', 'панел', 'асосӣ'],
    reply:
      '📂 **Лоиҳаҳо (Dashboard)**\n\nПас аз вуруд ба **«Лоиҳаҳо»** меравед — барои корбарони бо иҷозати лоиҳа.',
    priority: 2,
  },
  {
    id: 'chat',
    keywords: ['чат', 'chat', 'лайв', 'live', 'бот', 'bot', 'telegram', 'телеграм', 'yoqubkhoja_bot'],
    reply:
      '💬 **Чати зинда**\n\n• Тугмаи **«💬 Чат»** дар header\n• Аввал бо ёрдамчии зеҳни сунъӣ\n• Барои маъмур: **«📞 Дархост ба маъмур»**',
    priority: 2,
  },
  {
    id: 'how-to-use',
    keywords: [
      'чӣ тавр',
      'чӣ гуна',
      'how to',
      'how do',
      'истифода',
      'роҳнамо',
      'кумак',
      'кӯмак',
      'help',
      'ёрӣ',
      'what is',
      'чист',
    ],
    reply:
      '📖 **Роҳнамои умумӣ**\n\n' +
      '1. Сабти ном → интизори иҷозат\n2. Вуруд → меню\n3. Ташкилотҳо → бахш\n4. Чат — барои савол',
    priority: 1,
  },
  {
    id: 'edit-save',
    keywords: ['захира', 'save', 'таҳрир', 'edit', 'намефиристад', 'хато', 'error'],
    reply:
      '💾 **Захира ва таҳрир**\n\nАгар тугмаи захира намебинед — шумо «танҳо назорат» ҳастед ё иҷозат надоред. Ба маъмур муроҷиат кунед.',
    priority: 2,
  },
];

export const QUICK_TOPICS: QuickTopic[] = [
  { id: 'login', label: '🔑 Вуруд', message: 'Чӣ тавр ворид шавам?' },
  { id: 'register', label: '📝 Сабти ном', message: 'Чӣ тавр сабти ном кунем?' },
  { id: 'organizations', label: '🏢 Ташкилотҳо', message: 'Чӣ тавр ба ташкилотҳо дастрас шавам?' },
  { id: 'permissions', label: '🔐 Иҷозатҳо', message: 'Иҷозатҳо чӣ гуна дода мешаванд?' },
  { id: 'staff', label: '👥 Кадр', message: 'Кадр ва кормандонро чӣ тавр бинед?' },
  { id: 'finance', label: '💰 Молия', message: 'Бахши молияро чӣ тавр истифода барем?' },
  { id: 'supervision', label: '👁 Назорат', message: 'Режими танҳо назорат чист?' },
  { id: 'chat', label: '💬 Чат', message: 'Чат ва Telegram чӣ гуна кор мекунад?' },
];

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[?!.,;:]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function scoreEntry(text: string, entry: KnowledgeEntry): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    const kw = keyword.toLowerCase();
    if (text.includes(kw)) {
      score += kw.includes(' ') ? 3 : 1;
    }
  }
  if (entry.priority) {
    score += entry.priority * 0.1;
  }
  return score;
}

function findBestAnswer(text: string, minScore = 1): KnowledgeEntry | null {
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreEntry(text, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= minScore ? best : null;
}

function rankKnowledgeEntries(text: string, limit: number): KnowledgeEntry[] {
  const scored = KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: scoreEntry(text, entry),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.entry);
}

export function getRelevantKnowledgeSnippets(userMessage: string, limit = 3): string[] {
  return rankKnowledgeEntries(normalizeText(userMessage), limit).map((entry) => entry.reply);
}

function isShortGreeting(text: string): boolean {
  return /^(салом|ассалом|алло|ало|allo|hello|hi|привет|салам|salom|assalom|даром|hey|эй)([\s!?.]*)$/i.test(
    text.trim()
  );
}

function getReplyForQuickTopicId(quickTopicId: string): string | null {
  const entry = KNOWLEDGE_BASE.find((item) => item.id === quickTopicId);
  return entry?.reply ?? null;
}

export function isQuickTopicMessage(message: string, quickTopicId?: string): boolean {
  if (quickTopicId) return true;
  const normalized = normalizeText(message);
  return QUICK_TOPICS.some((topic) => normalizeText(topic.message) === normalized);
}

function getKeywordBotReply(userMessage: string): BotReply {
  const normalized = normalizeText(userMessage);
  const quickTopic = QUICK_TOPICS.find((topic) => normalizeText(topic.message) === normalized);
  if (quickTopic) {
    const byId = findBestAnswer(normalizeText(quickTopic.id)) ?? findBestAnswer(normalized);
    if (byId) return { body: byId.reply };
  }

  const match = findBestAnswer(normalized);
  if (match) {
    return { body: match.reply };
  }

  return {
    body:
      'Интихоби зудро интихоб кардед. Агар ҷавоб кофӣ набуд, саволро равшантар нависед ё **«📞 Дархост ба маъмур»**-ро пахш кунед.',
  };
}

function generateSmartLocalReply(userMessage: string, history: ChatMessage[]): string {
  const normalized = normalizeText(userMessage);
  const trimmed = userMessage.trim();

  if (isShortGreeting(trimmed)) {
    return (
      'Салом! 👋 Ман ёрдамчии Yoqubkhoja Hub ҳастам.\n\n' +
      'Дар бораи вуруд, иҷозатҳо, ташкилотҳо, кадр, молия ё чат савол диҳед.'
    );
  }

  const direct = findBestAnswer(normalized);
  if (direct) {
    return direct.reply;
  }

  const lastBot = [...history].reverse().find((message) => message.sender === 'bot');
  if (lastBot && normalized.length <= 30) {
    const context = normalizeText(lastBot.body);
    if (/бале|ҳа|yes|не|no|нафаҳмидам|фаҳмидам|боз|yana/i.test(normalized)) {
      if (context.includes('вуруд') || context.includes('login')) {
        return 'Дар бораи вуруд: /tj/login — номи вуруд ва рамз. Ҳисоби нави сабтшуда бояд аз ҷониби маъмур тасдиқ шавад.';
      }
      if (context.includes('иҷозат') || context.includes('доступ')) {
        return 'Дар бораи иҷозатҳо: маъмур ташкилот ва бахшҳоро муайян мекунад. Пас аз тағйир саҳифаро нав кунед.';
      }
    }
  }

  const isQuestion =
    normalized.includes('?') ||
    /^(чӣ|что|how|what|why|when|where|куҷо|кай|чаро|nima|qanday)\b/.test(normalized);

  if (isQuestion) {
    return (
      '🤖 **Ёрдамчии зеҳни сунъӣ**\n\n' +
      'Ман саволи шуморо гирифтам. Лутфан, каме равшантар нависед — мисол:\n' +
      '• «Чӣ тавр ворид шавам?»\n' +
      '• «Иҷозатҳо чӣ гуна дода мешаванд?»\n\n' +
      'Ё **«📞 Дархост ба маъмур»**-ро пахш кунед.'
    );
  }

  return (
    'Ман инҷо ҳастам, то дар истифодаи барнома кӯмак расонам. Саволро озодона нависед.'
  );
}

export function getWelcomeMessage(locale?: string): string {
  const language = normalizeAppLocale(locale);
  const messages: Record<ChatUserLanguage, string> = {
    tj:
      'Салом! 👋 Ман **ёрдамчии зеҳни сунъӣ**-и Yoqubkhoja Hub ҳастам.\n\n' +
      'Ман **ҳушёрам** — саҳифаи шуморо мебинам ва ҷавобро ба контексти кори шумо мувофиқ медиҳам.\n' +
      'Саволро озодона нависед.\n\n' +
      '🔒 Саволҳои оид ба сирри ташкилот ва маълумоти махфӣ ҷавоб дода намешаванд.\n' +
      'Барои маъмури зинда: **«📞 Дархост ба маъмур»**',
    ru:
      'Здравствуйте! 👋 Я **ИИ-помощник** Yoqubkhoja Hub.\n\n' +
      'Я **учитываю контекст** — вижу вашу страницу и отвечаю по ситуации.\n' +
      'Задайте вопрос свободно.\n\n' +
      '🔒 Вопросы о секретах организации и конфиденциальных данных не раскрываются.\n' +
      'Для живого администратора: **«📞 Запрос администратору»**',
    en:
      'Hello! 👋 I am the **AI assistant** for Yoqubkhoja Hub.\n\n' +
      'I am **context-aware** — I see your current page and tailor my answers.\n' +
      'Ask your question freely.\n\n' +
      '🔒 Questions about organization secrets and confidential data are not answered.\n' +
      'For a live admin: **«📞 Request admin»**',
    uz:
      'Salom! 👋 Men Yoqubkhoja Hub **sunʼiy intellekt yordamchisiman**.\n\n' +
      'Men **kontekstni hisobga olaman** — sahifangizni koʻraman va javobni moslashtiraman.\n' +
      'Savolingizni erkin yozing.\n\n' +
      '🔒 Tashkilot siri va maxfiy maʼlumotlar haqidagi savollarga javob berilmaydi.\n' +
      'Jonli administrator uchun: **«📞 Administratorga soʻrov»**',
  };
  return messages[language];
}

export function shouldEscalateByKeyword(text: string): boolean {
  const normalized = normalizeText(text);
  return ESCALATION_PHRASES.some((phrase) => normalized.includes(phrase));
}

export async function getBotReply(
  userMessage: string,
  history: ChatMessage[],
  options?: {
    quickTopicId?: string;
    locale?: string;
    conversation?: Pick<ChatConversation, 'displayName' | 'userId' | 'sourcePage'>;
  }
): Promise<BotReply> {
  const normalized = normalizeText(userMessage);
  const trimmed = userMessage.trim();
  const userLanguage = detectChatUserLanguage(userMessage, options?.locale);

  const aiReply = async () =>
    generateChatAIReply({
      userMessage,
      history,
      conversation: options?.conversation,
      userLanguage,
    });

  if (shouldEscalateByKeyword(normalized)) {
    return {
      body: getEscalationMessage(userLanguage),
      escalate: true,
    };
  }

  if (isQuickTopicMessage(userMessage, options?.quickTopicId)) {
    if (options?.quickTopicId) {
      const quickReply = getReplyForQuickTopicId(options.quickTopicId);
      if (quickReply && shouldUseTajikKnowledgeBase(userLanguage)) {
        return { body: quickReply };
      }
    }
    if (shouldUseTajikKnowledgeBase(userLanguage)) {
      return getKeywordBotReply(userMessage);
    }
    const reply = await aiReply();
    if (reply) return { body: reply };
    return { body: generateSmartLocalReply(userMessage, history) };
  }

  if (isOrganizationSecretQuestion(userMessage)) {
    return { body: getSecretRefusalMessage(userLanguage) };
  }

  if (isShortGreeting(trimmed)) {
    if (isChatAiConfigured()) {
      const reply = await aiReply();
      if (reply) return { body: reply };
    }
    if (!shouldUseTajikKnowledgeBase(userLanguage)) {
      return { body: getLocalizedGreeting(userLanguage, options?.conversation) };
    }
    const name = options?.conversation?.displayName?.trim();
    const greeting =
      name && name !== 'Меҳмон'
        ? `Салом, ${name}! 👋`
        : 'Салом! 👋';
    const pageNote = getPageGreetingNote(options?.conversation?.sourcePage);
    return {
      body:
        `${greeting} Ман ёрдамчии зеҳни сунъии Yoqubkhoja Hub ҳастам.${pageNote}\n\n` +
        'Чӣ тавр кӯмак расонам? Саволро озодона нависед.',
    };
  }

  if (shouldUseTajikKnowledgeBase(userLanguage)) {
    const strongMatch = findBestAnswer(normalized, 2.5);
    if (strongMatch && normalized.length <= 80) {
      return { body: strongMatch.reply };
    }
  }

  const reply = await aiReply();
  if (reply) {
    return { body: reply };
  }

  return { body: generateSmartLocalReply(userMessage, history) };
}

function getEscalationMessage(language: ChatUserLanguage): string {
  const messages: Record<ChatUserLanguage, string> = {
    tj: 'Хуб, ман маъмури сомонаро даъват мекунам. Лутфан, каме интизор шавед — ба шумо дар Telegram ё дар ҳамин чат ҷавоб медиҳанд.',
    ru: 'Хорошо, я приглашаю администратора сайта. Пожалуйста, подождите — вам ответят в Telegram или в этом чате.',
    en: 'Okay, I am requesting a site administrator. Please wait — you will get a reply in Telegram or in this chat.',
    uz: 'Yaxshi, men sayt administratorini chaqiryapman. Iltimos, biroz kuting — Telegram yoki shu chatda javob olasiz.',
  };
  return messages[language];
}

function getLocalizedGreeting(
  language: ChatUserLanguage,
  conversation?: Pick<ChatConversation, 'displayName' | 'sourcePage'>
): string {
  const name = conversation?.displayName?.trim();
  const hasName = name && name !== 'Меҳмон';

  const greetings: Record<ChatUserLanguage, string> = {
    tj: hasName ? `Салом, ${name}! 👋` : 'Салом! 👋',
    ru: hasName ? `Здравствуйте, ${name}! 👋` : 'Здравствуйте! 👋',
    en: hasName ? `Hello, ${name}! 👋` : 'Hello! 👋',
    uz: hasName ? `Salom, ${name}! 👋` : 'Salom! 👋',
  };

  const prompts: Record<ChatUserLanguage, string> = {
    tj: 'Чӣ тавр кӯмак расонам? Саволро озодона нависед.',
    ru: 'Чем могу помочь? Напишите ваш вопрос.',
    en: 'How can I help? Ask your question freely.',
    uz: 'Qanday yordam bera olaman? Savolingizni erkin yozing.',
  };

  return `${greetings[language]} ${prompts[language]}`;
}

export function getQuickTopicMessage(label: string): string | null {
  const topic = QUICK_TOPICS.find((item) => item.label === label);
  return topic?.message ?? null;
}

export function getEscalationConfirmationMessage(): string {
  return '✅ Дархост ба маъмур фиристода шуд. Маъмури сомона дар Telegram огоҳ мешавад ва ба зудӣ ҷавоб медиҳад.';
}

export function getAdminJoinedMessage(): string {
  return '🛡 Маъмури сомона ба чат пайваст. Шумо метавонед саволi худро нависед.';
}
