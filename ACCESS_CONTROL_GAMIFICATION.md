# 🔐 ACCESS CONTROL: Gamification & Notification System

## 📊 WHO CAN ACCESS WHAT

### **Current Access Control (As Built)**

All gamification features are currently restricted to **3 roles only**:

```typescript
authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "functionName");
```

---

## 👥 ROLES & THEIR ACCESS

### **1. PLAYER (Field Staff)**

**Can Access:** ✅ YES - FULL ACCESS

- ✅ View their own streak
- ✅ View their own achievements
- ✅ View their own scratch cards
- ✅ View their own daily challenges
- ✅ View their own contribution heatmap (LeetCode-style)
- ✅ Receive notifications
- ✅ Trigger gamification when creating leads/merchants
- ✅ Reveal scratch cards
- ✅ View XP and rank

**Restrictions:**

- ❌ Cannot view other players' gamification data
- ❌ Cannot access admin gamification dashboard
- ❌ Cannot modify other users' streaks/achievements

---

### **2. BRANCH_MANAGER**

**Can Access:** ✅ YES - FULL ACCESS (own data only)

- ✅ View their OWN streak (as a player)
- ✅ View their OWN achievements
- ✅ View their OWN scratch cards
- ✅ View their OWN daily challenges
- ✅ View their OWN contribution heatmap
- ✅ Receive notifications
- ✅ Trigger gamification when creating leads/merchants
- ✅ Reveal scratch cards

**Additional Manager Powers:**

- ✅ View branch-wide statistics (different feature)
- ✅ View players in their branch (different feature)
- ❌ **CANNOT** view individual players' streaks/achievements
- ❌ **CANNOT** modify players' gamification data
- ❌ **CANNOT** see players' scratch cards

**Current Limitation:** Branch managers can only see their PERSONAL gamification data, not their team's.

---

### **3. ADMIN**

**Can Access:** ✅ YES - FULL ACCESS (own data only)

- ✅ View their OWN streak
- ✅ View their OWN achievements
- ✅ View their OWN scratch cards
- ✅ View their OWN daily challenges
- ✅ View their OWN contribution heatmap
- ✅ Receive notifications

**Current Limitation:** Even admins can only see their PERSONAL gamification data!

---

## 🚨 CURRENT GAP / MISSING FEATURE

### **What's NOT Built Yet:**

#### **For Branch Managers:**

- ❌ Cannot see their team's streaks
- ❌ Cannot see which players are active today
- ❌ Cannot see branch leaderboard
- ❌ Cannot send motivational notifications to team
- ❌ Cannot view team's contribution heatmaps

#### **For Admins:**

- ❌ Cannot see all players' streaks across the bank
- ❌ Cannot see bank-wide leaderboard
- ❌ Cannot send bank-wide motivational notifications
- ❌ Cannot view analytics on engagement
- ❌ Cannot see which branches are most active

---

## 📝 ACCESS CONTROL IN CODE

### **Server Actions (gamification.ts)**

All gamification server actions use this authorization:

```typescript
// Line 33-36
export async function triggerGamificationOnAction(
  actionType: "LEAD" | "MERCHANT",
) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"], // ← Only these 3 roles
    "triggerGamificationOnAction",
  );
  // ...
}

// Line 109-113
export async function getGamificationData() {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"], // ← Only these 3 roles
    "getGamificationData",
  );
  // Returns data ONLY for session.id (current user)
}

// Line 131-136
export async function handleRevealScratchCard(cardId: string) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "handleRevealScratchCard",
  );
  return revealScratchCard(cardId, session.id); // ← Only own cards
}

// Line 139-143
export async function getContributionActivityData(days: number = 365) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "getContributionActivityData",
  );
  // Returns data ONLY for session.id (current user)
}
```

---

## 🎯 NOTIFICATION SYSTEM ACCESS

### **Who Receives Notifications:**

#### **In-App Popup Notifications**

- ✅ **PLAYER** - Receives their own notifications
- ✅ **BRANCH_MANAGER** - Receives their own notifications
- ✅ **ADMIN** - Receives their own notifications

#### **WhatsApp/Telegram/Facebook Notifications**

- ✅ **PLAYER** - If they connected their phone number
- ✅ **BRANCH_MANAGER** - If they connected their phone number
- ✅ **ADMIN** - If they connected their phone number

**Note:** Multi-channel notifications (WhatsApp, Telegram, Facebook) are **NOT YET IMPLEMENTED** in code. Only the database schema and notification service are ready.

---

## 📊 DATABASE RELATIONSHIPS

### **User Model Relations:**

```prisma
model User {
  id                 String                      @id @default(cuid())
  role               Role                        @default(PLAYER)

  // Gamification relations (OWN data only)
  achievements       Achievement[]               // User's achievements
  dailyChallenges    DailyChallenge[]            // User's challenges
  scratchCards       ScratchCard[]               // User's scratch cards
  streak             UserStreak?                 // User's streak
  notifications      Notification[]              // User's notifications
  notificationPrefs  UserNotificationPreference? // User's notification settings
}
```

**Key Point:** All gamification data is linked to individual users via `userId`. There's no "view all" or "view team" functionality built yet.

---

## 🔒 SECURITY FEATURES

### **Current Security:**

1. **Role-Based Access Control**
   - Only PLAYER, BRANCH_MANAGER, ADMIN can access gamification
   - Other roles (if any) are blocked

2. **User Isolation**
   - Each user can only see their OWN data
   - Uses `session.id` to filter all queries
   - Cannot access other users' gamification data

3. **Server-Side Authorization**
   - All actions check authorization on server
   - Cannot bypass by modifying frontend
   - JWT token validation on every request

### **What's Protected:**

- ✅ Users cannot fake streaks
- ✅ Users cannot give themselves achievements
- ✅ Users cannot reveal other users' scratch cards
- ✅ Users cannot modify other users' XP
- ✅ Users cannot see other users' private data

---

## 🚀 RECOMMENDED ENHANCEMENTS

### **For Branch Managers (Team View):**

```typescript
// NEW: View team streaks
export async function getTeamStreaks() {
  const session = await authorize(
    ["BRANCH_MANAGER", "ADMIN"],
    "getTeamStreaks",
  );

  // Get all players in manager's branch
  const teamMembers = await prisma.user.findMany({
    where: { branchId: session.branchId },
    include: { streak: true },
    orderBy: { xp: "desc" },
  });

  return teamMembers;
}

// NEW: View branch leaderboard
export async function getBranchLeaderboard() {
  const session = await authorize(["BRANCH_MANAGER"], "getBranchLeaderboard");

  return prisma.user.findMany({
    where: { branchId: session.branchId },
    select: { id: true, name: true, xp: true, streak: true },
    orderBy: { xp: "desc" },
    take: 20,
  });
}
```

### **For Admins (Bank-Wide View):**

```typescript
// NEW: Bank-wide leaderboard
export async function getBankLeaderboard() {
  const session = await authorize(["ADMIN"], "getBankLeaderboard");

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      xp: true,
      streak: true,
      branch: { select: { name: true } },
    },
    orderBy: { xp: "desc" },
    take: 100,
  });
}

// NEW: Engagement analytics
export async function getEngagementAnalytics() {
  const session = await authorize(["ADMIN"], "getEngagementAnalytics");

  const [totalStreaks, avgStreak, activeToday] = await Promise.all([
    prisma.userStreak.count(),
    prisma.userStreak.aggregate({ _avg: { currentStreak: true } }),
    prisma.userStreak.count({
      where: {
        lastActionDate: { gte: startOfDay(new Date()) },
      },
    }),
  ]);

  return { totalStreaks, avgStreak, activeToday };
}

// NEW: Send motivational notification to branch
export async function sendBranchNotification(
  branchId: string,
  message: string,
) {
  const session = await authorize(
    ["BRANCH_MANAGER", "ADMIN"],
    "sendBranchNotification",
  );

  const branchUsers = await prisma.user.findMany({
    where: { branchId },
  });

  // Create notification for all users in branch
  await prisma.notification.createMany({
    data: branchUsers.map((user) => ({
      userId: user.id,
      type: "MOTIVATIONAL",
      title: "Branch Update",
      message: message,
      priority: "NORMAL",
    })),
  });
}
```

---

## 📋 SUMMARY TABLE

| Feature                     | PLAYER | BRANCH_MANAGER       | ADMIN                |
| --------------------------- | ------ | -------------------- | -------------------- |
| View own streak             | ✅     | ✅                   | ✅                   |
| View own achievements       | ✅     | ✅                   | ✅                   |
| View own scratch cards      | ✅     | ✅                   | ✅                   |
| View own challenges         | ✅     | ✅                   | ✅                   |
| View own heatmap            | ✅     | ✅                   | ✅                   |
| Receive notifications       | ✅     | ✅                   | ✅                   |
| **View team streaks**       | ❌     | ❌ **Need to build** | ❌ **Need to build** |
| **View branch leaderboard** | ❌     | ❌ **Need to build** | ❌ **Need to build** |
| **View bank leaderboard**   | ❌     | ❌                   | ❌ **Need to build** |
| **Send team notifications** | ❌     | ❌ **Need to build** | ❌ **Need to build** |
| **View analytics**          | ❌     | ❌                   | ❌ **Need to build** |

---

## 🎯 WHAT YOU HAVE NOW vs. WHAT YOU NEED

### **✅ Already Built (Personal Use):**

- Streak tracking for individual users
- Achievement system for individual users
- Scratch cards for individual users
- Daily challenges for individual users
- Contribution heatmap for individual users
- In-app popup notifications

### **❌ Not Built Yet (Management Features):**

- Branch managers viewing team data
- Admins viewing bank-wide data
- Leaderboards (branch/bank level)
- Motivational notifications from managers
- Engagement analytics dashboard
- Team competitions
- Branch vs branch competitions

---

## 💡 NEXT STEPS

**If you want managers/admins to see team data:**

1. **For Branch Managers:**
   - Build team leaderboard component
   - Build branch streak overview
   - Build "active today" widget
   - Add ability to send motivational messages

2. **For Admins:**
   - Build bank-wide leaderboard
   - Build engagement analytics dashboard
   - Build branch comparison charts
   - Add bank-wide announcement system

**Would you like me to build these management features?** 🚀
