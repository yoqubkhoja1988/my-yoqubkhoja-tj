# Пайваст кардани домен

Масалан: `yoqubkhoja.tj` ё `hub.yoqubkhoja.tj`

## Қадам 1 — Домен харид кунед

Хизматрасониҳои маъмул:

| Хизматрасонӣ | Сайт |
|--------------|------|
| Reg.tj | https://reg.tj |
| Namecheap | https://namecheap.com |
| Cloudflare | https://cloudflare.com |

---

## Қадам 2 — Netlify

1. Ба https://app.netlify.com равед
2. Сайти худро интихоб кунед
3. **Domain management** → **Add a domain**
4. Номи доменро ворид кунед: `yoqubkhoja.tj`

---

## Қадам 3 — DNS танзимот

Дар панели домен (Reg.tj, Namecheap ва ғ.):

### Вариант A — Subdomain (`hub.yoqubkhoja.tj`)

| Type | Name | Value |
|------|------|-------|
| CNAME | hub | `your-site.netlify.app` |

### Вариант B — Домени асосӣ (`yoqubkhoja.tj`)

| Type | Name | Value |
|------|------|-------|
| A | @ | `75.2.60.5` |
| CNAME | www | `your-site.netlify.app` |

> IP-и Netlify: `75.2.60.5` — дар Netlify → Domain settings санҷед (метавонад тағйир ёбад)

---

## Қадам 4 — HTTPS

Netlify автоматӣ сертификати SSL месозад (Let's Encrypt). 5–30 дақиқа интизор шавед.

---

## Натиҷа

Сомона дар ин адресҳо дастрас мешавад:

- `https://yoqubkhoja.tj/tj/login`
- `https://yoqubkhoja.tj/ru/dashboard`

---

## Маслиҳат

Дар Netlify → **Domain management** → **Primary domain** домени асосиро интихоб кунед.

Барои редирект аз `www` ба домени асосӣ Netlify автоматӣ кор мекунад.
