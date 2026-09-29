# DFZ Messenger

Статус релиза: разработка продолжается; весь production scope ещё не реализован.
Актуальные ограничения и порядок развёртывания: [DEPLOYMENT.md](DEPLOYMENT.md).
`npm test` запускается только с явным DATABASE_URL локальной `dfz_rebuild_qa`.
Dev-seed работает только с пустой локальной БД и не удаляет существующие данные.

> DFZ Messenger — разрабатываемый realtime web-мессенджер на Next.js, Express, PostgreSQL и Socket.IO.

---

## ⚡ О проекте

**DFZ Messenger** спроектирован как монорепозиторий и фундамент для всей будущей экосистемы (Web, PWA, Android, iOS, Desktop).

### Ключевые возможности:
- **Realtime Сообщения**: WebSocket (Socket.IO) с поддержкой состояний `sending`, `sent`, `delivered`, `read`, `failed`, идемпотентностью и оптимистичным UI.
- **Приватные диалоги, Группы и Каналы**:
  - 1-to-1 диалоги с проверкой блокировок.
  - Личный чат **Избранное (Saved Messages)**.
  - Группы с ролевой моделью (`OWNER`, `ADMIN`, `MEMBER`), гранулярными правами и инвайт-ссылками.
  - Публичные и приватные каналы с вещанием.
- **Медиа и файлы**:
  - Изображения с полноэкранным Lightbox-просмотром и зумом.
  - Видеопроигрыватель.
  - Документы и архивы с валидацией MIME-типов и безопасными UUID-именами.
- **Голосовые сообщения**:
  - Запись в браузере через MediaRecorder API с таймером и отменой.
  - Интерактивный плеер с визуализацией звуковой волны (waveform), перемоткой и скоростями (1x, 1.5x, 2x).
- **WebRTC Аудио и Видеозвонки**:
  - Сигнализация через WebSocket.
  - Mute микрофона, переключение камеры, таймер звонка, плавающее окно вызова.
- **Безопасность**:
  - Хеширование паролей bcrypt (12 раундов).
  - HttpOnly SameSite Secure Cookies для Access & Refresh токенов (защита от кражи токенов через XSS).
  - Защита от brute-force с помощью rate-limiter.
  - Управление сессиями и устройствами: завершение конкретного сеанса или всех остальных сеансов.
  - Серверные проверки блокировок (Blocked Users) и прав доступа (IDOR/Broken Access Control).
- **Панель Администратора и Модерация (`/admin`)**:
  - Метрики: общее число пользователей, активные сеансы, сообщения, чаты, группы, каналы, uptime.
  - Управление пользователями: блокировка (бан с отзывом всех активных сеансов), сброс, назначение ролей.
  - Очередь жалоб (Reports Queue): модерация обращений.
  - Журнал аудита действий администрации (Audit Log).
- **PWA & Offline UX**:
  - Поддержка установки PWA (manifest.json, offline detection, индикаторы переподключения).

---

## 🛠 Стек технологий

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons, Zustand, Socket.IO Client.
- **Backend**: Express + TypeScript Modular Architecture, Socket.IO Gateway, Prisma ORM, bcryptjs, jsonwebtoken, Multer, Zod.
- **База данных**: PostgreSQL 16+.
- **Кэш / Состояние**: Redis (с отказоустойчивым In-Memory fallback для разработки без сторонних сервисов).
- **Звонки**: WebRTC (RTCPeerConnection + STUN).

---

## 📁 Структура проекта

```
messenger/
├── apps/
│   ├── api/                   # Backend Application
│   │   ├── prisma/            # Схема БД, миграции, seed
│   │   ├── src/
│   │   │   ├── auth/          # Аутентификация, сессии, cookies, rate-limit
│   │   │   ├── users/         # Профили, аватары, настройки приватности, блокировка
│   │   │   ├── contacts/      # Управление контактами
│   │   │   ├── chats/         # 1-to-1, Группы, Каналы, Избранное
│   │   │   ├── messages/      # Сообщения, курсорная пагинация, реакции, статусы
│   │   │   ├── media/         # Загрузка и раздача файлов, валидация MIME
│   │   │   ├── search/        # Глобальный и локальный поиск
│   │   │   ├── admin/         # Админ-панель, аудит-лог
│   │   │   ├── moderation/    # Жалобы и модерация
│   │   │   └── gateway/       # Центральный WebSocket Gateway
│   │   └── test/              # Интеграционные тесты
│   └── web/                   # Frontend Next.js Client
│       ├── public/            # PWA манифест, иконки
│       └── src/
│           ├── app/           # App Router (/(auth), /onboarding, /admin, /)
│           ├── components/    # UI компоненты, чат, плеер, звонки, модалки
│           ├── stores/        # Zustand хранилища (auth, chat, call)
│           └── lib/           # API клиент, Socket.IO, WebRTC
├── packages/
│   ├── types/                 # Общие TypeScript интерфейсы и DTO
│   └── config/                # Общие константы и параметры брендинга
├── infrastructure/
│   ├── docker-compose.yml     # Полный Docker Compose стек
│   ├── Dockerfile.api         # Multi-stage production образ backend
│   └── Dockerfile.web         # Multi-stage production образ frontend
├── .env.example               # Шаблон конфигурации
└── README.md
```

---

## 🚀 Быстрый старт (Local Development)

### 1. Требования:
- Node.js v18+ (рекомендуется v20+)
- PostgreSQL (запущен локально или через Docker)

### 2. Установка зависимостей:
```bash
npm install
```

### 3. Сборка общих пакетов:
```bash
npm run build --workspace=@dfz/config
npm run build --workspace=@dfz/types
```

### 4. Настройка базы данных и переменных окружения:
Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```
Убедитесь, что параметр `DATABASE_URL` указывает на вашу базу данных PostgreSQL (например, `postgresql://postgres:password@localhost:5432/dfz_messenger?schema=public`).

Примените схему базы данных:
```bash
npm run db:push
```

Запустите начальное наполнение тестовыми данными (seed):
```bash
npm run db:seed
```

### 5. Запуск тестов:
```bash
npm test
```

### 6. Запуск серверов разработки:
- Запуск Backend (порт 4000):
```bash
npm run dev:api
```
- Запуск Frontend (порт 3000):
```bash
npm run dev:web
```

Откройте в браузере: `http://localhost:3000`

---

## 👥 Тестовые учетные записи (Seed Accounts)

После выполнения `npm run db:seed` в базе созданы следующие пользователи:

1. **Главный Администратор (Superadmin):**
   - Username: `dfzadmin`
   - Пароль: значение `ADMIN_PASSWORD`, заданное перед локальным seed.
   - Доступ к панели: `http://localhost:3000/admin`

2. **Инженер (User 1):**
   - Username: `alex_dev`
   - Пароль: `TestPass123!`

3. **Дизайнер (User 2):**
   - Username: `elena_ux`
   - Пароль: `TestPass123!`

---

## 🐳 Запуск через Docker Compose

Для развертывания полного окружения (PostgreSQL + Redis + MinIO + API + Web) одной командой:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Сервисы будут доступны по адресам:
- **Веб-интерфейс**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **MinIO Консоль**: `http://localhost:9001` (логин: `minioadmin`, пароль: `minioadmin`)

---

## 🔒 Безопасность и архитектурные решения

1. **HttpOnly Cookies**: Токены аутентификации хранятся в защищенных cookies с атрибутами `HttpOnly`, `SameSite=Lax`, предотвращая кражу через XSS.
2. **Курсорная пагинация**: Пагинация сообщений реализована через курсоры по `id` и `createdAt`, что исключает деградацию производительности `OFFSET` на миллионах строк.
3. **Безопасная обработка файлов**: Имена загружаемых файлов заменяются на криптостойкие UUID с валидацией реального MIME-типа на стороне сервера для предотвращения Path Traversal и RCE.
4. **Контроль доступа (RBAC)**: Все операции над группами, каналами и сообщениями валидируют членство пользователя и его роль (`OWNER`, `ADMIN`, `MEMBER`) непосредственно в сервисе перед выполнением SQL-запроса.
