const SECRET_TOPIC_PATTERNS: RegExp[] = [
  /музд|маош|salary|wage|нафақа|иловапул|пардохт.*корманд/i,
  /ҳисоб.*бонк|bank\s*account|р\/сч|расчётн|счёт.*бонк/i,
  /парол|password|рамз(и)?\s*(корбар|вуруд|ҳисоб)/i,
  /маълумот.*(корманд|шахсӣ|хусусӣ)|датa.*корманд|employee.*(data|record)/i,
  /сирри\s*ташкилот|махфӣ|махфи|конфиденциал|internal\s*data/i,
  /рақам.*(телефон|тел)\s*(директор|муҳосиб|корманд)/i,
  /телефон.*(директор|муҳосиб|корманд).*(чӣ|чанд|номер)/i,
  /сумма|маблағ|хаҷм.*(молия|пардохт|фонд|бюджет)/i,
  /ведомост|payroll\s*ledger|Ҷадвали\s*ҳузур.*корманд/i,
  /ҳисобот.*(молия|дохил|internal)/i,
  /рма.*(ташкилот|муассиса).*(номер|рақам|чӣ аст)/i,
  /номи\s*пурра.*корманд|фамилия.*корманд|ҷойи\s*кор.*корманд/i,
  /шумораи\s*кадр.*(дақиқ|анақиқ)|чанд\s*корманд/i,
  /экспорт.*(маълумот|дода)|скачать.*(данн|дода)/i,
  /auth_secret|database_url|telegram_bot_token/i,
];

const PUBLIC_TOPIC_EXCEPTIONS: RegExp[] = [
  /чӣ\s*тавр|чӣ\s*гуна|how\s*to|роҳнамо|истифода\s*бар/i,
  /иҷозат|доступ|access|permission/i,
  /вуруд|login|сабт|register/i,
  /ба\s*кадр\s*дастрас|ба\s*молия\s*дастрас/i,
];

export function isOrganizationSecretQuestion(message: string): boolean {
  const text = message.trim();
  if (!text) return false;

  const normalized = text.toLowerCase();

  if (PUBLIC_TOPIC_EXCEPTIONS.some((pattern) => pattern.test(normalized))) {
    const hasStrongSecretSignal = /музд|маош|парол|ҳисоби\s*бонк|р\/сч|ведомост/i.test(
      normalized
    );
    if (!hasStrongSecretSignal) {
      return false;
    }
  }

  return SECRET_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getSecretRefusalMessage(): string {
  return (
    '🔒 **Ман ин саволро ҷавоб дода наметавонам**\n\n' +
    'Саволҳои оид ба **сирри ташкилот**, маълумоти **шахсии кормандон**, ' +
    '**музд**, **ҳисоби бонкӣ**, **парол** ё **маълумоти молиявии дохилӣ** ' +
    'танҳо барои маъмури расмӣ дастрасанд.\n\n' +
    'Лутфан, барои ин намуди дархост **«📞 Дархост ба маъмур»**-ро пахш кунед.'
  );
}
