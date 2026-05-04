# 🎮 Gamification System - Feature Prompts & Descriptions

## 📱 PERSISTENT NOTIFICATION SYSTEM

### **What It Does:**

A popup notification system that appears at the top of the screen on **ALL pages** of your application, even when users are navigating between different sections (dashboard, leads, merchants, missions, etc.).

### **Key Features:**

#### 1. **Always Visible**

- Fixed position at top of screen (z-index 50)
- Works across all routes/pages
- Auto-checks for new notifications every 30 seconds
- Appears even after browser minimize/restore

#### 2. **Rich Notification Types**

Each type has unique colors, icons, and animations:

**🏆 Achievement Unlocked**

- Color: Yellow/Orange gradient
- Icon: Trophy (pulsing animation)
- Shows: Achievement name + XP reward
- Example: "🏆 Achievement Unlocked! You earned 'First Steps'! +50 XP"

**🔥 Streak Milestone**

- Color: Orange/Red gradient
- Icon: Fire (pulsing animation)
- Shows: Current streak days
- Example: "🔥 Streak Milestone! Incredible! You've reached a 7-day streak! Keep it up!"

**✨ Scratch Card Earned**

- Color: Purple/Pink gradient
- Icon: Sparkles (pulsing animation)
- Shows: "Tap to reveal your reward"
- Includes: Reveal button
- Example: "✨ You Earned a Scratch Card! Tap to reveal your reward!"

**⚡ Flash Mission**

- Color: Blue/Cyan gradient
- Icon: Star (pulsing animation)
- Shows: Mission title + XP multiplier
- Example: "⚡ Flash Mission Available! Zone B3 - 3x XP!"

**📈 Leaderboard Update**

- Color: Green gradient
- Icon: Star (pulsing animation)
- Shows: New rank position
- Example: "📈 You Moved Up! You're now #3 on the leaderboard! Keep climbing!"

#### 3. **Smart Queue System**

- Handles multiple notifications
- Progress dots show position in queue
- Dismissible with X button
- Smooth animations between notifications

#### 4. **Auto-Triggered Events**

Notifications are created when:

- User creates a lead
- User inducts a merchant
- Streak reaches milestone (7, 14, 21, 30, 50, 100, 365 days)
- Achievement unlocked
- Scratch card earned
- Flash mission available
- Leaderboard rank changes

### **Technical Implementation:**

**Component:** `PersistentNotificationPopup.tsx`

- Location: `src/components/notifications/`
- Polling: Every 30 seconds
- Data source: Notifications table with `metadata.showPopup = true`
- Priority: HIGH and URGENT notifications shown first

**Backend Service:** `gamification-notification-service.ts`

- Creates rich notifications with metadata
- Sets `showPopup: true` for popup-worthy notifications
- Includes context data (XP amounts, streak numbers, etc.)

---

## 🔥 STREAK TRACKING SYSTEM

### **What It Does:**

A LeetCode-style streak tracker that encourages daily activity by tracking consecutive days of user engagement, with freeze shields to protect streaks and milestone celebrations.

### **Key Features:**

#### 1. **Daily Streak Counter**

- Tracks consecutive days of activity
- Updates automatically when user creates leads or inducts merchants
- Shows current streak prominently
- Displays "Last activity: Today/Yesterday/X days ago"

#### 2. **Freeze Shield System**

- Earn 1 freeze shield every 10 days
- Maximum 3 shields stored at once
- Use shield to skip 1 day without breaking streak
- Visual indicator showing available shields

**Example:**

```
🔥 14-Day Streak!
🛡️ 1 Shield available
```

#### 3. **Milestone Celebrations**

Special celebrations at key milestones:

- 7 days → "Weekly Warrior"
- 14 days → "Bi-Weekly Champion"
- 21 days → "Three Week Streak"
- 30 days → "Monthly Master"
- 50 days → "Half Century"
- 100 days → "Legendary"
- 365 days → "Unstoppable!"

Each milestone triggers:

- Popup notification
- Achievement unlock (with XP reward)
- Visual celebration in streak tracker

#### 4. **Progress Tracking**

- Progress bar to next milestone
- Shows "X days to go" until next milestone
- Personal best (longest streak ever) tracking
- Visual milestone badges (achieved vs. upcoming)

#### 5. **Streak Protection**

- If user misses 1 day without shield → Streak resets to 0
- If user has shield → Automatically used to protect streak
- Warning notifications when streak at risk

### **Visual Design:**

**Component:** `StreakTracker.tsx`

- Location: `src/components/gamification/`
- Background: Orange/Red gradient
- Fire icon with pulsing animation
- Progress bars for milestones
- Badge-style milestone indicators
- Shield count display

**Example Display:**

```
┌─────────────────────────────────────┐
│ 🔥 14-Day Streak!          🛡️ 1   │
│ Last activity: Today                │
│                                     │
│ Next milestone: 21 days            │
│ ████████████░░░░░░  7 days to go  │
│                                     │
│ ┌──────────┬──────────┐            │
│ │ 🏆 Best  │ 🔥 Current│            │
│ │ 27 days  │ 14 days  │            │
│ └──────────┴──────────┘            │
│                                     │
│ Milestones:                         │
│ ✓ 7  ✓ 14  ○ 21  ○ 30  ○ 50      │
│                                     │
│ 💡 Earn a freeze shield every 10   │
│    days! Use it to skip a day.     │
└─────────────────────────────────────┘
```

### **Technical Implementation:**

**Backend Service:** `streak-service.ts`

- `updateUserStreak(userId)` - Called on user activity
- `getUserStreak(userId)` - Fetch streak data
- `useFreezeShield(userId)` - Consume a shield

**Database Model:** `UserStreak`

```prisma
model UserStreak {
  userId          String   @unique
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  lastActionDate  DateTime
  freezeShields   Int      @default(0)
  updatedAt       DateTime
}
```

**Auto-Update Logic:**

- Checks `lastActionDate` vs. today
- If consecutive day → Increment streak
- If day missed → Use shield or reset to 1
- Awards shield every 10 days (max 3)
- Detects milestones and triggers notifications

---

## 🎯 HOW THEY WORK TOGETHER

### **User Journey Example:**

**Day 1-6:** User creates leads daily

- Streak increases: 1 → 2 → 3 → 4 → 5 → 6
- No popup yet (waiting for milestone)

**Day 7:** User creates another lead

```
🔥 Popup appears: "Streak Milestone! 7-day streak!"
🏆 Popup appears: "Achievement Unlocked: Weekly Warrior! +100 XP"
✨ Popup appears: "You Earned a Scratch Card!"
```

**Day 8-13:** User continues activity

- Streak: 8 → 9 → 10 → 11 → 12 → 13
- At day 10: Earns 1 freeze shield

**Day 14:** Another milestone!

```
🔥 Popup: "Streak Milestone! 14-day streak!"
🏆 Popup: "Achievement Unlocked! +150 XP"
```

**Day 15:** User forgets to log in

- System auto-uses freeze shield
- Streak protected at 14 days

**Day 16:** User returns

```
🛡️ Popup: "Freeze shield used! Your 14-day streak is safe!"
```

---

## 🎮 ADDICTION MECHANICS

### **Why This Keeps Users Engaged:**

1. **Loss Aversion**
   - "I don't want to break my 14-day streak!"
   - Users return daily to maintain streak

2. **Variable Rewards**
   - Scratch cards with random prizes
   - Unpredictable = addictive (slot machine effect)

3. **Progressive Goals**
   - Always working toward next milestone
   - Visual progress bars create urgency

4. **Instant Gratification**
   - Immediate popup notifications
   - XP awarded instantly
   - Visual celebration on achievements

5. **Social Proof**
   - Leaderboard shows streak rankings
   - Competition with peers
   - "Meron has a 21-day streak, I need to catch up!"

6. **FOMO (Fear Of Missing Out)**
   - 24-hour scratch card expiration
   - Time-limited flash missions
   - Daily challenges reset every day

---

## 📊 INTEGRATION POINTS

### **Where Triggers Happen:**

**Lead Creation:**

```typescript
// In src/app/actions/leads.ts
await triggerGamificationOnAction("LEAD");
// Updates streak, checks achievements, updates challenges
```

**Merchant Induction:**

```typescript
// In merchant induction action
await triggerGamificationOnAction("MERCHANT");
// All of the above + generates scratch card
```

**Automatic Notifications:**

- Streak milestones → Auto-popup
- Achievements → Auto-popup
- Scratch cards → Auto-popup with reveal button

---

## 🎨 CUSTOMIZATION OPTIONS

### **Change Milestones:**

Edit `StreakTracker.tsx`:

```typescript
const MILESTONES = [7, 14, 21, 30, 50, 100, 365];
```

### **Change Notification Check Frequency:**

Edit `PersistentNotificationPopup.tsx`:

```typescript
const interval = setInterval(fetchNotifications, 30000); // 30 seconds
```

### **Change Shield Earn Rate:**

Edit `streak-service.ts`:

```typescript
if (newStreak % 10 === 0 && streak.freezeShields < 3) {
  earnedShield = true;
}
```

---

## 🚀 GETTING STARTED

### **To Enable These Features:**

1. **Add popup to layout** (`src/app/layout.tsx`):

```typescript
import { PersistentNotificationPopup } from "@/components/notifications/PersistentNotificationPopup";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PersistentNotificationPopup />
      </body>
    </html>
  );
}
```

2. **Trigger on actions**:

```typescript
import { triggerGamificationOnAction } from "@/app/actions/gamification";

// After creating lead or merchant:
await triggerGamificationOnAction("LEAD"); // or "MERCHANT"
```

3. **Show streak tracker** (optional dashboard):

```typescript
import { StreakTracker } from "@/components/gamification/StreakTracker";

<StreakTracker streak={userData.streak} />
```

---

## 💡 SUCCESS METRICS

### **What to Track:**

1. **Daily Active Users** - How many check the system daily
2. **Average Streak Length** - Engagement indicator
3. **Streak Milestone Completion** - How many reach 7, 14, 30 days
4. **Freeze Shield Usage** - How often shields are used
5. **Notification Open Rate** - % of popups viewed
6. **Scratch Card Reveal Time** - How quickly revealed
7. **Return Rate** - Users coming back next day after streak starts

---

## 🎯 THE PSYCHOLOGY

### **Why This Works:**

**Streak System:**

- ✅ Creates daily habit formation
- ✅ Loss aversion (don't want to break chain)
- ✅ Visual progress is motivating
- ✅ Milestones give sense of achievement

**Notification System:**

- ✅ Instant positive reinforcement
- ✅ Variable rewards create anticipation
- ✅ Social proof through leaderboards
- ✅ FOMO through time-limited offers

**Combined Effect:**

- Users open app every morning to check streak
- Users stay engaged to earn rewards
- Users compete with peers on leaderboard
- Users feel accomplished seeing progress
- **Result: Addicted to merchant onboarding!** 🚀

---

This is your complete gamification system that will make Cooperative Bank of Oromia staff ** WANT ** to register merchants every single day!
