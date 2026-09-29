# DFZ Messenger: запуск и ограничения релиза

Проверено 29 сентября 2026. Приложение уже существует; этот этап исправляет безопасность auth/media/privacy и конкурентную отправку сообщений. Полное выполнение спецификации и production-ready статус **не подтверждены**.

## Структура

- `apps/web`: Next.js, React, Zustand, компоненты чатов и настроек.
- `apps/api/src`: Express, auth, chats/messages, Socket.IO, media, stories, economy, admin.
- `apps/api/prisma`: PostgreSQL schema, две существующие миграции, dev-seed.
- `packages/types`, `packages/config`: общие контракты и параметры.
- `infrastructure`: Docker-шаблоны; перед production необходимо заменить встроенные пароли и JWT secrets.
- `docs/FEATURE_AUDIT.md`: история проверки и незавершённые функции.

## Локальный запуск

Нужны Node.js, npm, PostgreSQL. Redis необходим для проверки поведения production-инфраструктуры; локальный memory fallback ему не эквивалентен.

```sh
npm ci
cp .env.example .env
npm run build --workspace=@dfz/config
npm run build --workspace=@dfz/types
npm run db:generate
```

Заполнить `.env`: `DATABASE_URL`, `REDIS_URL`, **разные случайные** `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` (не менее 32 случайных байт каждый), `CLIENT_URL`, `UPLOAD_DIR`, `PORT`, настройки cookies. Для текущего хранилища использовать `STORAGE_DRIVER=local` и постоянный диск. S3 adapter ещё отсутствует; переменные `S3_*` сами по себе его не включают.

Для frontend переменные `NEXT_PUBLIC_API_URL` и `NEXT_PUBLIC_WS_URL` задаются в окружении процесса сборки или `apps/web/.env.local`. Первый URL можно оставить пустым для same-origin `/api`; второй должен указывать на работающий standalone Socket.IO backend. `API_INTERNAL_URL` задаёт адрес этого backend для Next.js proxy.

Для **новой пустой** БД:

```sh
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Для существующей БД: резервная копия, сравнение live schema с Prisma и migration history, затем только проверенная additive migration. Не выполнять baseline CREATE statements поверх существующих таблиц и не использовать `db push` как production migration workflow. На этом этапе schema не изменялась и production migration не выполнялась.

В двух терминалах:

```sh
npm run dev:api
npm run dev:web
```

`npm run dev` в корне сейчас последовательно запускает workspace scripts; для двух долгоживущих процессов использовать две команды выше. Dev-seed необязателен: он разрешён только для пустой локальной `dfz_messenger` или `dfz_rebuild_qa`, требует `ADMIN_PASSWORD` длиной минимум 12 символов, отказывается удалять существующие данные. Не запускать его в production.

## Проверки

Создать отдельную пустую локальную `dfz_rebuild_qa` и применить миграции с явным `DATABASE_URL`. PowerShell:

```powershell
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:5432/dfz_rebuild_qa?schema=public'
$env:UPLOAD_DIR='C:/Users/Lenovo/Desktop/messenger/uploads/qa'
npm.cmd test
npm.cmd run build:api
npm.cmd run build:web
```

Пароль PostgreSQL подставить из своей локальной конфигурации. Тесты отказываются запускаться на другой БД. Suite включает core auth/chat, authorization/privacy, management HTTP, security hardening, Stars/Gifts и клиентский refresh. Economy suite создаёт тестовые записи в QA; эта БД не предназначена для пользовательских данных. Не запускать Next dev и build одновременно в одной `.next`.

Security hardening проверяет конкурентные повторы отправки, ротацию/replay refresh, отзыв доступа к media, CSRF, подписи файлов, ownership, контакты, приватные stories и group policy. Проверка magic bytes не заменяет полное декодирование изображений, удаление metadata или malware scanning.

## Внешние сервисы и недостающие интеграции

- PostgreSQL: рабочий URL и резервное копирование.
- Redis: подключение/доступ; в текущем прогоне Redis недоступен, использовался memory fallback.
- Хранилище: текущая реализация — приватные файлы на постоянном локальном томе. Для serverless нужен ещё не реализованный object-storage adapter.
- Почта для verification/reset, SMS, payment provider: полноценные адаптеры ещё не реализованы. Одних credentials недостаточно; оплату и доставку писем не считать работающими.
- WebRTC: STUN/TURN, `NEXT_PUBLIC_STUN_SERVERS`, `NEXT_PUBLIC_TURN_URL/USERNAME/PASSWORD`. TURN credentials попадают в клиентскую сборку; перед релизом нужен механизм короткоживущих credentials. Требуется тест реального соединения на двух устройствах.

## Порядок production-развёртывания после устранения блокеров

1. Заменить все примерные secrets; настроить HTTPS, точный `CLIENT_URL`, secure cookies и ограниченный CORS. Проверить конфигурацию Redis и постоянного приватного хранилища.
2. Выполнить проверенную migration procedure с резервной копией. Production не должен зависеть от dev-seed.
3. `npm ci`, `npm run db:generate`, сборка shared packages, `npm run build:api`, `npm run build:web`.
4. Запустить `npm run start --workspace=@dfz/api` и `npm run start --workspace=@dfz/web` под process manager/container. Reverse proxy направляет `/api` и `/socket.io` к API, поддерживает WebSocket upgrade. Vercel сам по себе не заменяет постоянный Socket.IO backend или диск.
5. Проверить health и реальные HTTPS-сценарии: login, `/api/chats`, `/api/settings`, отправка между двумя пользователями, upload/download, отзыв сессии, запрет чужого chat/file, WebSocket reconnect.
6. Выполнить полный mobile/desktop QA, dependency/security audit, резервное восстановление и нагрузочное тестирование. До этого релиз не считать готовым.

После установки этих изменений старые refresh-токены требуют повторного входа: раньше hash не сохранялся. Ссылки на media теперь требуют действующей сессии; URL query-токены не принимаются, shared cache запрещён. Старые файлы без записи `Upload` недоступны до проверенного восстановления метаданных ownership; автоматически делать их публичными нельзя.

Незавершённый scope включает verification/reset и 2FA, object storage/обработку изображений, полную offline очередь с retry, marketplace/payment flow, часть privacy/settings/channel/admin workflows, полный Premium enforcement и весь responsive/call/PWA acceptance matrix. См. аудит; наличие UI-компонента не означает готовность функции.
