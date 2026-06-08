# Yoqubkhoja Hub

Многоязычный портал проектов (RU, EN, TJ, UZ) с авторизацией.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте: http://localhost:3000/tj/login

**Логин:** `yoqub`  
**Пароль:** `YkUb1988`

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и настройте:

- `AUTH_SECRET` — случайная строка для сессий
- `AUTH_USERNAME` — логин
- `AUTH_PASSWORD_HASH` — SHA-256 хеш пароля

## Deploy на Netlify

1. Загрузите репозиторий на GitHub
2. Подключите к Netlify: https://app.netlify.com
3. Добавьте переменные окружения в Netlify:
   - `AUTH_SECRET`
   - `AUTH_USERNAME`
   - `AUTH_PASSWORD_HASH`
4. Build command: `npm run build`
5. Plugin: `@netlify/plugin-nextjs` (уже в netlify.toml)
