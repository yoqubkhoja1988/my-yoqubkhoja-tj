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

## Агар Reg.tj кор накунад — алтернативаҳо

### Домени `.tj` (Тоҷикистон)

| Хизматрасонӣ | Сайт | Нарх |
|--------------|------|------|
| **Admin.tj** | https://admin.tj/domain/ | ~227 сом/сол |
| **Navju Cloud** | https://navjucloud.tj/register-domain-tj | ~199 сом/сол |
| **Hoster.tj** | http://www.hoster.tj/services_domains/ | ~200 сом/сол |
| **101domain** (хориҷӣ) | https://www.101domain.com/tj.htm | ~$58/сол |

Рӯйхати расмӣ: https://www.nic.tj

### Агар `.tj` дастнорас бошад

Домени `.com` ё `.dev` харед (осонтар):

| Хизматрасонӣ | Сайт |
|--------------|------|
| **Namecheap** | https://namecheap.com |
| **Cloudflare** | https://cloudflare.com/products/registrar/ |
| **Porkbun** | https://porkbun.com |

Мисол: `yoqubkhoja.com` → ҳамон танзимот дар Netlify

### Бе харид (ройгон)

Сайти ҳозира кор мекунад:
**https://yoqubkhojatj.netlify.app/tj/login**
