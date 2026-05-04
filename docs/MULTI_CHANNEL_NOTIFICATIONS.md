# Multi-Channel Notifications (Streak + Scout Focus)

This project now has a channel router built around your scouting workflow:

- Scout submitted (`SCOUT_SUBMITTED`)
- Streak reminders (`DAILY_STREAK_REMINDER`)
- Inactivity alerts (`INACTIVE_REMINDER`)
- Streak at risk (`STREAK_AT_RISK`, urgent)
- Weekly summary (`WEEKLY_PROGRESS_REPORT`)
- Existing achievement notifications (`ACHIEVEMENT`)

## What was added

- `src/backend/services/notification-router-service.ts`
  - Central routing to `IN_APP`, `EMAIL`, `TELEGRAM`, `WHATSAPP`, `FACEBOOK`, `WEB_PUSH`
  - Quiet hours and max-per-day checks
  - Urgent bypass support
  - Retry attempts (up to 3)
  - Delivery logging per channel into `Notification` rows (`metadata`)
- `src/backend/services/notification-preferences-service.ts`
  - Default channel preferences
  - Quiet-hours helper
  - Preference bootstrap per user
- Channel adapters:
  - `src/backend/services/channels/email-channel-service.ts`
  - `src/backend/services/channels/telegram-channel-service.ts`
  - `src/backend/services/channels/whatsapp-channel-service.ts`
  - `src/backend/services/channels/facebook-channel-service.ts`
  - `src/backend/services/channels/web-push-channel-service.ts`
- Scheduled jobs endpoint:
  - `src/app/api/notifications/scheduled/route.ts`
- Telegram webhook:
  - `src/app/api/notifications/telegram/webhook/route.ts`
- Facebook webhook:
  - `src/app/api/notifications/facebook/webhook/route.ts`
- Scout flow integration:
  - `src/app/actions/leads.ts` now emits `SCOUT_SUBMITTED`
- Existing gamification notifications now route through multi-channel router:
  - `src/backend/services/gamification-notification-service.ts`

## Project-specific messaging mapping

Use these as your base style (same vibe, your domain):

- Streak reminder: `"🔥 Keep your streak alive"` + current streak days
- Scout success: `"✅ Scout submitted"` + business/zone context
- At-risk: `"🚨 Streak at risk"` with urgent priority
- Achievement: `"🏆 Achievement Unlocked!"` with badge title and XP
- Weekly: `"📊 Weekly Progress"` with scouts and XP

## Required env variables

See `.env.example` additions:

- Core: `NEXT_PUBLIC_APP_URL`, `NOTIFICATION_SCHEDULER_SECRET`
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- Facebook: `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_WEBHOOK_VERIFY_TOKEN`
- WhatsApp: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Push gateway (optional): `PUSH_GATEWAY_URL`, `PUSH_GATEWAY_TOKEN`

## How to trigger scheduled sends now

Call:

- `POST /api/notifications/scheduled` with header `x-scheduler-secret`
- Body one of:
  - `{ "job": "daily-8am" }`
  - `{ "job": "daily-2pm" }`
  - `{ "job": "daily-5pm-urgent" }`
  - `{ "job": "weekly-sunday-7pm" }`

You can connect this endpoint to cron, Vercel Cron, GitHub Actions, or any scheduler.

## User/channel linking flow

- Telegram:
  - User sends `/start u_<userId>` to bot
  - Webhook stores `telegramChatId` and enables TELEGRAM
- Facebook:
  - User messages page with `CONNECT <userId>`
  - Webhook stores `facebookPsid` and enables FACEBOOK
- WhatsApp:
  - Save phone via preferences action
- Web Push:
  - Save browser endpoint via preferences action

## Next UI step (recommended)

Build `Notification Preferences` UI using:

- `getMyNotificationPreferences()`
- `updateMyNotificationPreferences()`

from `src/app/actions/notification-preferences.ts`.

