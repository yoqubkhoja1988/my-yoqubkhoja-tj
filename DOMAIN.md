# Пайваст кардани домен yoqubkhoja.tj

**Сайти ҳозира:** https://gleeful-douhua-c4e8c8.netlify.app  
**Домени нав:** https://yoqubkhoja.tj

---

## Қадам 1 — Netlify (2 дақиқа)

1. Кушоед: https://app.netlify.com/projects/gleeful-douhua-c4e8c8/configuration/domains
2. **Add a domain** → `yoqubkhoja.tj` → **Verify**
3. **Add domain alias** → `www.yoqubkhoja.tj` (ихтиёрӣ)
4. **Primary domain** → `yoqubkhoja.tj` интихоб кунед

Netlify сатрҳои DNS-ро нишон медиҳад — онҳоро дар қадами 2 ворид кунед.

---

## Қадам 2 — DNS (дар Reg.tj ё панели домен)

| Type | Host / Name | Value |
|------|-------------|-------|
| **A** | `@` | `75.2.60.5` |
| **CNAME** | `www` | `gleeful-douhua-c4e8c8.netlify.app` |

> IP-ро дар Netlify → Domain settings санҷед (метавонад тағйир ёбад).

Интизор шавед 15–60 дақиқа (баъзан то 24 соат).

---

## Қадам 3 — Environment variables дар Netlify

**Site configuration** → **Environment variables** → илова кунед:

| Key | Value |
|-----|-------|
| `AUTH_URL` | `https://yoqubkhoja.tj` |
| `NEXT_PUBLIC_SITE_URL` | `https://yoqubkhoja.tj` |

Баъд: **Deploys** → **Trigger deploy** → **Deploy site**

---

## Қадам 4 — Санҷед

- https://yoqubkhoja.tj/tj/login
- https://yoqubkhoja.tj/ru/login

Сайти кӯҳна автоматӣ редирект мешавад:
`gleeful-douhua-c4e8c8.netlify.app` → `yoqubkhoja.tj`

---

## Агар домен ҳанӯз харида нашуда бошад

1. https://reg.tj ё https://namecheap.com
2. Домен `yoqubkhoja.tj`-ро харед
3. Баъд қадамҳои болоро иҷро кунед
