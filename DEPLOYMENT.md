# 🚀 DFZ Messenger — Production Deployment & Cloud Setup

## 1. Защита базы данных от переполнения («чтоб база не заполнялась»)

В DFZ Messenger встроен автоматический серверный сервис технического обслуживания **`DatabaseMaintenanceService`**:
* **Истории (Stories):** Автоматически удаляются через 24 часа после публикации (`expiresAt < now`). Каскадно очищаются связанные просмотры (`StoryView`) и реакции (`StoryReaction`).
* **Журнал звонков:** Завершенные, отклоненные и пропущенные звонки старше 30 дней архивируются и удаляются.
* **Сессии авторизации:** Просроченные токены и завершенные сессии пользователей удаляются автоматически.
* **Периодичность:** Цикл очистки запускается каждые 30 минут в фоновом режиме, а также при старте сервера.

### Рекомендуемая облачная база данных (PostgreSQL)
Для продакшена рекомендуется использовать бесплатные облачные PostgreSQL с автоматическим сжатием и пулером соединений:
1. **[Neon.tech](https://neon.tech/)** (бесплатный Serverless Postgres, автомасштабирование, встроенный pgbouncer).
2. **[Supabase](https://supabase.com/)** (встроенный Transaction Pooler на порту 6543, защита от утечек памяти).

В строке подключения добавьте `?sslmode=require&pgbouncer=true` для устойчивости serverless-соединений.

---

## 2. Развертывание Frontend на Vercel

### Вариант А: Через Vercel CLI
```bash
npx vercel
```
При развертывании в консоли:
* **Set up and deploy?** → Yes
* **Which scope?** → Выберите свой аккаунт
* **Link to existing project?** → No
* **Project name?** → `dfz-messenger`
* **Root directory?** → `.` (корень проекта)
* Настройки сборки подхватятся автоматически из `vercel.json` (`npm run build:web`).

### Вариант Б: Через GitHub Integration (Рекомендуется)
1. Откройте [Vercel Dashboard](https://vercel.com/new).
2. Импортируйте ваш репозиторий `dfz-messenger` из GitHub.
3. В разделе **Environment Variables** укажите:
   * `NEXT_PUBLIC_APP_NAME` = `DFZ Messenger`
   * `NEXT_PUBLIC_API_URL` = `https://ваш-api-сервер.up.railway.app`
   * `NEXT_PUBLIC_WS_URL` = `https://ваш-api-сервер.up.railway.app`
4. Нажмите **Deploy**.

---

## 3. Развертывание Backend API & WebSockets (Railway / Render / VPS)

Так как мессенджер использует постоянные двусторонние веб-сокеты (Socket.IO) для мгновенной доставки сообщений и WebRTC звонков, backend развертывается на платформе с поддержкой долгоживущих процессов (Railway, Render или VPS):

### Переменные окружения для API:
```env
NODE_ENV="production"
PORT=4000
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
JWT_ACCESS_SECRET="dfz_super_secret_access_key_production_2026"
JWT_REFRESH_SECRET="dfz_super_secret_refresh_key_production_2026"
CLIENT_URL="https://dfz-messenger.vercel.app"
STORAGE_DRIVER="local"
```

Команда запуска API:
```bash
npm run db:push --workspace=@dfz/api
npm run start --workspace=@dfz/api
```
