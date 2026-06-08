# Қадамҳои баровардан дар интернет

## 1. GitHub

### Вариант A — тавассути браузер
1. Ба https://github.com/new равед
2. Ном: `my-yoqubkhoja-tj`
3. Public интихоб кунед → Create repository
4. Дар Terminal иҷро кунед:

```powershell
cd C:\Users\user\Projects\my-yoqubkhoja-tj
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-yoqubkhoja-tj.git
git push -u origin main
```

`YOUR_USERNAME`-ро бо номи GitHub-и худ иваз кунед.

### Вариант B — GitHub CLI
```powershell
winget install GitHub.cli
gh auth login
cd C:\Users\user\Projects\my-yoqubkhoja-tj
gh repo create my-yoqubkhoja-tj --public --source=. --push
```

---

## 2. Netlify

1. Ба https://app.netlify.com равед
2. **Add new site** → **Import an existing project**
3. GitHub-ро пайваст кунед → репозиторияи `my-yoqubkhoja-tj`-ро интихоб кунед
4. Build settings (автоматӣ):
   - Build command: `npm run build`
   - Plugin: `@netlify/plugin-nextjs`
5. **Environment variables** илова кунед:

| Key | Value |
|-----|-------|
| `AUTH_SECRET` | як сатри тасодуфӣ (масалан: `my-secret-key-2026-yoqub`) |
| `AUTH_USERNAME` | `yoqub` |
| `AUTH_PASSWORD_HASH` | `fc30043c381b6e6c79faae8309f4484ab9317a58ae4afaa328b5e926f350878f` |

6. **Deploy site**-ро пахш кунед

Сайт омода мешавад: `https://your-site-name.netlify.app/tj/login`
