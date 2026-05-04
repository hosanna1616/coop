# 🚀 COMPLETE BUILD INSTRUCTION PROMPT

## Gamified Notification System with Multi-Channel Phone Popups

---

## 📋 PROJECT OVERVIEW

**Build for:** Cooperative Bank of Oromia (Ethiopia)
**Purpose:** Make field staff ADDICTED to merchant onboarding through gamification
**Problem:** Staff forget to register merchants without notifications
**Solution:** LeetCode-style streaks + scratch cards + multi-channel phone notifications

---

## 🎯 CORE REQUIREMENTS

### **1. LeetCode-Style Contribution Heatmap**

Build a visual activity tracker showing daily merchant onboarding:

**Features:**

- 365-day grid (like GitHub/LeetCode contributions)
- Color intensity based on activity:
  - ⬜ Gray = 0 merchants
  - 🟩 Light green = 1-2 merchants
  - 🟩🟩 Medium green = 3-5 merchants
  - 🟩🟩🟩 Dark green = 6-10 merchants
  - 🟩🟩🟩🟩 Neon green = 11+ merchants (LEGENDARY!)
- Hover tooltips showing exact numbers
- Toggle between leads/merchants view
- Stats: Most active day, total active days, current streak

**Visual Design:**

```
Activity Heatmap - 2024
Total: 342 merchants | Active: 187/365 days

Jan  Feb  Mar  Apr  ...
⬜🟩🟩⬜🟩🟩🟩🟩⬜🟩 ...
🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩 ...
🟩⬜🟩🟩🟩🟩🟩⬜🟩🟩 ...

Less ⬜🟩🟩🟩🟩 More
```

---

### **2. Streak Tracking System (Like Duolingo + LeetCode)**

Build an addictive daily streak system:

**Features:**

- Track consecutive days of merchant onboarding
- Fire animation showing current streak
- Freeze shields (earn 1 every 10 days, max 3)
- Milestone celebrations at: 7, 14, 21, 30, 50, 100, 365 days
- Progress bar to next milestone
- Personal best tracking
- Auto-warning when streak at risk

**Visual Design:**

```
┌──────────────────────────────────────┐
│ 🔥 14-Day Streak!           🛡️ 1   │
│ Last activity: Today                 │
│                                      │
│ Next milestone: 21 days              │
│ ████████████░░░░░░ 7 days to go    │
│                                      │
│ ┌───────────┬───────────┐           │
│ │ 🏆 Best   │ 🔥 Current│           │
│ │ 27 days   │ 14 days   │           │
│ └───────────┴───────────┘           │
│                                      │
│ Milestones:                          │
│ ✓ 7  ✓ 14  ○ 21  ○ 30  ○ 50       │
│                                      │
│ 💡 Tip: Earn shields every 10 days! │
└──────────────────────────────────────┘
```

**Streak Rules:**

- Activity = creating lead OR inducting merchant
- Miss 1 day without shield = streak resets to 0
- Miss 1 day with shield = auto-use shield, streak continues
- Earn 1 shield every 10 days (max 3 stored)

---

### **3. MULTI-CHANNEL NOTIFICATION SYSTEM**

Build notifications that popup on phone from ALL channels:

#### **A. WhatsApp Notifications**

**Integration:** WhatsApp Business API
**When it pops up:** Top of phone screen like regular WhatsApp message

**Message Examples:**

```
🔥 STREAK ALERT!
Abebe, your 14-day streak expires at midnight!
Quick, register 1 lead to keep it going!

[Open App] [Dismiss]

━━━━━━━━━━━━━━━━━━

🏆 ACHIEVEMENT UNLOCKED!
Congratulations! You earned "Deal Maker"
Inducted your first merchant!

+100 XP earned!

[View Achievement] [Share]

━━━━━━━━━━━━━━━━━━

✨ SCRATCH CARD EARNED!
You just got a scratch card!
Tap to reveal your reward:

🎰 [Reveal Now]

Possible rewards: 50-500 XP, Freeze Shield, Double XP
```

#### **B. Telegram Notifications**

**Integration:** Telegram Bot API
**When it pops up:** Top of phone like Telegram message

**Message Examples:**

```
⚡ FLASH MISSION!
Zone B3 is now worth 3x XP for 2 hours!

📍 Location: Bole Sub-City
⏰ Expires: 2:00 PM
🎁 Reward: 300 XP + Mystery Prize

[Accept Mission] [Later]

━━━━━━━━━━━━━━━━━━

📊 LEADERBOARD UPDATE!
You moved from #5 to #3!

Current rankings:
🥇 Meron - 2,450 XP
🥈 Kebede - 2,200 XP
🥉 YOU - 2,100 XP ← Only 100 XP from #2!

[Climb Higher] [View Full Board]
```

#### **C. Facebook Messenger Notifications**

**Integration:** Facebook Messenger Platform
**When it pops up:** Top of phone like Messenger notification

**Message Examples:**

```
🎯 DAILY CHALLENGES READY!
Your 3 challenges for today:

1️⃣ Scout 3 leads (0/3) → +50 XP
2️⃣ Induct 2 merchants (0/2) → +150 XP
3️⃣ Visit 5 zones (0/5) → +75 XP

BONUS: Complete all 3 → Mystery Reward 🎁

[Start Challenges]

━━━━━━━━━━━━━━━━━━

🏅 WEEKLY REPORT
Great week, Abebe!

✅ Scouted: 18 leads (+5 vs last week)
✅ Inducted: 12 merchants (Rank #3)
🔥 Streak: 14 days
📈 Next rank: OFFICER (150 XP away)

[View Details] [Share Achievement]
```

#### **D. Web Push Notifications (Browser)**

**Integration:** Web Push API
**When it pops up:** Top of phone/desktop even when browser is closed

**Features:**

- Works when browser is minimized
- Works on mobile browsers (Chrome, Safari)
- Persistent until dismissed
- Rich notifications with action buttons

---

### **4. NOTIFICATION TIMING STRATEGY**

Smart delivery based on user behavior:

**Morning (8:00 AM):**

```
☀️ Good morning, Abebe!
Your streak is at 14 days.
Register 1 lead today to keep it alive!

Yesterday, Meron inducted 5 merchants.
Can you beat her today? 💪

[Start Now]
```

**Midday (1:00 PM) - If inactive:**

```
⏰ 12:47 PM Update
Your branch is #2 in today's leaderboard.
Log 1 merchant in next 2 hours to reach #1!

[Quick Register]
```

**Evening (5:00 PM) - Streak at risk:**

```
🔥 URGENT: STREAK ALERT!
Your 14-day streak expires at midnight!

Quick, register 1 lead to keep it going!
Takes less than 2 minutes ⚡

[Save My Streak]
```

**Achievement Unlocked (Immediate):**

```
🏆 NEW BADGE EARNED!
"Speed Demon" - 3 merchants in 1 hour!

+200 XP earned!
Share this achievement?

[Share to Team] [Keep Going]
```

---

## 🛠️ TECHNICAL IMPLEMENTATION

### **Database Schema**

```prisma
// Enhanced Notification model
model Notification {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  type          String   // ACHIEVEMENT, STREAK, SCRATCH_CARD, FLASH_MISSION, etc.
  title         String
  message       String
  priority      String   // LOW, NORMAL, HIGH, URGENT
  channel       String   // IN_APP, WHATSAPP, TELEGRAM, FACEBOOK, WEB_PUSH
  metadata      Json?    // {showPopup: true, xpReward: 100, streak: 14, etc.}
  seenAt        DateTime?
  createdAt     DateTime @default(now())
}

// Streak tracking
model UserStreak {
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastActionDate  DateTime
  freezeShields   Int      @default(0)
  updatedAt       DateTime @updatedAt
}

// Achievements
model Achievement {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  code        String   // UNIQUE_CODE
  title       String
  icon        String   // Emoji
  xpReward    Int
  unlockedAt  DateTime @default(now())

  @@unique([userId, code])
}

// Scratch cards
model ScratchCard {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  rewardType  String   // XP, FREEZE_SHIELD, POWER_UP, RAFFLE_TICKET
  rewardValue Int
  revealed    Boolean  @default(false)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}

// Daily challenges
model DailyChallenge {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  title       String
  targetType  String   // LEADS, MERCHANTS, ZONES
  targetValue Int
  currentValue Int     @default(0)
  xpReward    Int
  date        DateTime
  completed   Boolean  @default(false)

  @@unique([userId, date, title])
}

// User notification preferences
model UserNotificationPreference {
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  motivationType  String   // COMPETITOR, ACHIEVER, SOCIAL, REWARD
  whatsapp        Boolean  @default(false)
  telegram        Boolean  @default(false)
  facebook        Boolean  @default(false)
  webPush         Boolean  @default(true)
  quietHoursStart String   @default("20:00")
  quietHoursEnd   String   @default("07:00")
  maxPerDay       Int      @default(5)
}
```

---

### **Backend Services**

#### **1. Notification Router Service**

```typescript
class NotificationRouter {
  async send(userId: string, notification: Notification) {
    const prefs = await getUserPreferences(userId);

    // Send to all enabled channels
    if (prefs.whatsapp) {
      await WhatsAppService.send(userId, notification);
    }
    if (prefs.telegram) {
      await TelegramService.send(userId, notification);
    }
    if (prefs.facebook) {
      await FacebookService.send(userId, notification);
    }
    if (prefs.webPush) {
      await WebPushService.send(userId, notification);
    }
  }
}
```

#### **2. WhatsApp Service**

```typescript
class WhatsAppService {
  static async send(userId: string, notification: Notification) {
    const phoneNumber = await getUserWhatsApp(userId);

    await whatsappClient.sendMessage(phoneNumber, {
      type: "template",
      template: {
        name: "gamification_alert",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: notification.title },
              { type: "text", text: notification.message },
            ],
          },
        ],
        buttons: [
          {
            type: "url",
            text: "Open App",
            url: "https://merchant-nation.app/open",
          },
        ],
      },
    });
  }
}
```

#### **3. Telegram Bot Service**

```typescript
class TelegramService {
  static async send(userId: string, notification: Notification) {
    const chatId = await getUserTelegramChatId(userId);

    await telegramBot.sendMessage(chatId, notification.message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🎯 Open App", callback_data: "open_app" },
            { text: "❌ Dismiss", callback_data: "dismiss" },
          ],
        ],
      },
    });
  }
}
```

#### **4. Facebook Messenger Service**

```typescript
class FacebookService {
  static async send(userId: string, notification: Notification) {
    const pageScopes = await getUserFacebookId(userId);

    await facebookClient.sendTextMessage(userId, {
      text: notification.message,
      quick_replies: [
        {
          content_type: "text",
          title: "Open App",
          payload: "OPEN_APP",
        },
      ],
    });
  }
}
```

#### **5. Web Push Service**

```typescript
class WebPushService {
  static async send(userId: string, notification: Notification) {
    const subscriptions = await getUserPushSubscriptions(userId);

    for (const subscription of subscriptions) {
      await webPush.sendNotification(
        subscription,
        JSON.stringify({
          title: notification.title,
          body: notification.message,
          icon: "/icons/notification-icon.png",
          badge: "/icons/badge.png",
          data: { url: "/notifications", type: notification.type },
          actions: [
            { action: "view", title: "View" },
            { action: "dismiss", title: "Dismiss" },
          ],
          tag: notification.id,
          requireInteraction: notification.priority === "URGENT",
        }),
      );
    }
  }
}
```

---

### **Frontend Components**

#### **1. Persistent Popup (All Pages)**

```typescript
// Shows at top of screen, checks every 30 seconds
function PersistentNotificationPopup() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Poll for new notifications
    const interval = setInterval(async () => {
      const newNotifications = await fetchUnseenPopups();
      if (newNotifications.length > 0) {
        setNotifications(newNotifications);
        // Trigger phone vibration
        navigator.vibrate?.(200);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {notifications.map((notif) => (
        <NotificationCard key={notif.id} notification={notif} />
      ))}
    </div>
  );
}
```

#### **2. Streak Tracker Component**

```typescript
function StreakTracker({ streak }) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg">
      <div className="flex items-center gap-3">
        <Fire className="w-10 h-10 text-orange-500 animate-pulse" />
        <div>
          <h3 className="text-2xl font-bold">{streak.currentStreak}-Day Streak!</h3>
          <p className="text-sm text-gray-600">Last activity: {getLastActionText()}</p>
        </div>
      </div>

      {/* Progress to next milestone */}
      <ProgressBar current={streak.currentStreak} next={getNextMilestone()} />

      {/* Milestone badges */}
      <MilestoneBadges current={streak.currentStreak} />

      {/* Freeze shields */}
      {streak.freezeShields > 0 && (
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          <span>{streak.freezeShields} shields available</span>
        </div>
      )}
    </div>
  );
}
```

#### **3. Contribution Heatmap**

```typescript
function ContributionHeatmap({ activityData }) {
  const days = generateYearGrid(activityData);

  return (
    <div className="bg-white p-6 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Activity Heatmap</h3>

      <div className="grid grid-flow-col gap-1">
        {days.map((week) => (
          <div key={week.id} className="grid grid-rows-7 gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm ${getLevelColor(day.count)}`}
                title={`${day.date}: ${day.count} merchants`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-4 text-sm">
        <span>Less</span>
        <div className="flex gap-1">
          {LEVEL_COLORS.map(color => (
            <div key={color} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
```

---

## 🔗 INTEGRATION POINTS

### **Trigger Gamification on Actions**

```typescript
// In lead creation action
export async function createLead(data: LeadData) {
  const lead = await prisma.lead.create({ data });

  // Trigger gamification
  await triggerGamificationOnAction(userId, "LEAD");

  return lead;
}

// In merchant induction action
export async function inductMerchant(data: MerchantData) {
  const merchant = await prisma.merchant.create({ data });

  // Trigger gamification (includes scratch card)
  await triggerGamificationOnAction(userId, "MERCHANT");

  return merchant;
}

// Main gamification trigger
async function triggerGamificationOnAction(
  userId: string,
  actionType: "LEAD" | "MERCHANT",
) {
  // 1. Update streak
  const streakResult = await updateUserStreak(userId);
  if (streakResult.milestone) {
    await createStreakNotification(userId, streakResult.currentStreak);
  }

  // 2. Check achievements
  const achievements = await checkAndUnlockAchievements(userId);
  for (const achievement of achievements) {
    await createAchievementNotification(userId, achievement);
  }

  // 3. Generate scratch card (for merchants only)
  if (actionType === "MERCHANT") {
    const scratchCard = await generateScratchCard(userId);
    await createScratchCardNotification(userId, scratchCard);
  }

  // 4. Update daily challenges
  await updateChallengeProgress(userId, actionType);

  // 5. Send notifications to all channels
  await sendNotifications(userId);
}
```

---

## 📱 PHONE NOTIFICATION SETUP

### **WhatsApp Business API Setup**

1. Create Facebook Developer account
2. Apply for WhatsApp Business API
3. Get phone number approved
4. Create message templates
5. Integrate with webhook

**Required:**

- Facebook Business account
- Verified phone number
- Message template approval
- Webhook endpoint

### **Telegram Bot Setup**

1. Create bot via @BotFather
2. Get bot token
3. Set webhook
4. Store user chat IDs

**Required:**

- Telegram account
- Bot token from @BotFather
- Webhook URL

### **Facebook Messenger Setup**

1. Create Facebook Page
2. Create Facebook App
3. Enable Messenger product
4. Get page access token
5. Set webhook

**Required:**

- Facebook Page
- Facebook Developer account
- App review approval

### **Web Push Setup**

1. Generate VAPID keys
2. Create service worker
3. Request notification permission
4. Store subscriptions

**Required:**

- VAPID key pair
- Service worker file
- HTTPS (for production)

---

## 🎮 ADDICTION MECHANICS

### **Variable Rewards (Like Slot Machines)**

- Scratch cards with random prizes
- Unpredictable = keeps users coming back
- "Maybe next one will be the 500 XP jackpot!"

### **Loss Aversion**

- "Don't break your 14-day streak!"
- Freeze shields add strategy
- Warning notifications before streak expires

### **Social Proof**

- Leaderboard shows who's ahead
- "Meron inducted 5 merchants yesterday"
- Branch competitions

### **FOMO (Fear Of Missing Out)**

- Flash missions expire in 2 hours
- Daily challenges reset at midnight
- Scratch cards expire in 24 hours

### **Progressive Goals**

- Always something to work toward
- Next milestone always visible
- XP bar to next rank

---

## 📊 SUCCESS METRICS

Track these to measure engagement:

1. **Daily Active Users** - How many open app daily
2. **Average Streak Length** - Engagement indicator
3. **Notification Open Rate** - % who click notifications
4. **Channel Effectiveness** - Which channel gets most opens
5. **Scratch Card Reveal Time** - How quickly revealed
6. **Challenge Completion Rate** - % completing all 3 daily
7. **Merchant Onboarding Rate** - Before vs after gamification

---

## 🚀 DEPLOYMENT CHECKLIST

### **Phase 1: Core Features**

- [ ] Database schema migration
- [ ] Streak tracking service
- [ ] Achievement system
- [ ] Scratch card system
- [ ] Daily challenges
- [ ] In-app popup notifications
- [ ] LeetCode-style heatmap

### **Phase 2: Multi-Channel**

- [ ] WhatsApp Business API integration
- [ ] Telegram bot integration
- [ ] Facebook Messenger integration
- [ ] Web Push notifications
- [ ] Notification preference settings
- [ ] Smart timing engine

### **Phase 3: Advanced**

- [ ] Flash missions
- [ ] Leaderboard system
- [ ] Team competitions
- [ ] Monthly reports
- [ ] Analytics dashboard
- [ ] A/B testing for notifications

---

## 💰 COST ESTIMATES

### **WhatsApp Business API**

- Conversations: ~$0.005-0.05 per message
- 1000 staff × 3 messages/day = ~$15-150/month

### **Telegram Bot**

- Free! (No API costs)

### **Facebook Messenger**

- Free for first 1000 conversations/month
- Then ~$0.01 per message

### **Web Push**

- Free (using Firebase Cloud Messaging)

**Total Estimated Cost:** $15-200/month depending on channels used

---

## 🎯 FINAL USER EXPERIENCE

### **A Day in the Life of Abebe (Bank Staff):**

**8:00 AM** - Wakes up, checks phone

```
📱 WhatsApp notification pops up:
"☀️ Good morning! Your streak is 14 days.
Register 1 lead today to keep it alive!"
```

**9:00 AM** - Arrives at office, opens app

```
🔥 Popup at top of screen:
"🎯 Daily Challenges: Scout 3 leads (0/3)"
```

**10:30 AM** - Scouts first lead

```
🏆 Popup: "Achievement Unlocked: First Steps! +50 XP"
✨ Popup: "Scratch Card Earned! Tap to reveal"
🎰 Reveals: "You won 150 XP!"
📱 Telegram notification: "Great job! +150 XP earned!"
```

**1:00 PM** - Lunch break, hasn't done more

```
📱 Facebook Messenger notification:
"⏰ You're 2 leads from completing today's challenge!"
```

**3:00 PM** - Scouts 2 more leads

```
✅ Challenge complete! +50 XP
📊 "You moved to #3 on leaderboard!"
```

**5:00 PM** - About to leave

```
📱 WhatsApp notification:
"🔥 FLASH: Zone B3 worth 3x XP for next hour!
Only 2 other staff know about this!"
```

**6:00 PM** - Inducts merchant in Zone B3

```
🎉 "3x XP earned! +450 XP instead of 150!"
🏆 "New Badge: Zone Conqueror!"
🎰 "Another Scratch Card! Reveals: 500 XP JACKPOT!"
```

**Result:** Abebe is ADDICTED. He:

- ✅ Checked phone first thing in morning
- ✅ Came back multiple times throughout day
- ✅ Stayed late to capture flash mission
- ✅ Registered 4 leads + 1 merchant (vs usual 1-2)
- ✅ Will tell colleagues about his jackpot win

---

## 🏁 BUILD THIS NOW!

This system will transform your staff from:
❌ "I'll register merchants later"
✅ "I need to register NOW to keep my streak!"

**The combination of:**

- LeetCode-style visual progress
- Streak psychology (don't break the chain!)
- Multi-channel phone notifications (WhatsApp, Telegram, Facebook)
- Variable rewards (scratch cards)
- Social competition (leaderboards)

**= UNSTOPPABLE ENGAGEMENT!** 🚀
