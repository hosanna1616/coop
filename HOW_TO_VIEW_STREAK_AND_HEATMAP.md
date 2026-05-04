# 👤 HOW TO VIEW STREAK & LEETCODE HEATMAP AS PLAYER

---

## ✅ WHERE TO FIND THEM NOW

### **1. LeetCode-Style Contribution Heatmap**

**Location:** ✅ Profile Page

**Steps to View:**

1. **Login** at http://localhost:3000
   - Email: `player@example.com`
   - Password: `DevPassword1!`

2. **Click "Profile"** in the navigation menu

3. **Scroll down** - you'll see:
   - **Streak Tracker** (at the top with fire icon 🔥)
   - **Activity Heatmap** (365-day grid with green squares)

---

## 📍 EXACT LOCATION ON PROFILE PAGE

```
┌─────────────────────────────────────────┐
│  Profile Page                           │
├─────────────────────────────────────────┤
│  👤 User Info Card                      │
│  - Name, Rank, XP                       │
│  - Progress to next rank                │
├─────────────────────────────────────────┤
│  📊 Operations Overview                 │
│  - Zones, Leads, Merchants stats        │
├─────────────────────────────────────────┤
│  🔥 STREAK TRACKER (NEW!)              │
│  - Current streak (e.g., "14-Day!")     │
│  - Freeze shields (🛡️)                  │
│  - Progress to next milestone           │
│  - Milestone badges (7, 14, 21, 30...)  │
├─────────────────────────────────────────┤
│  🟩 ACTIVITY HEATMAP (Already there)   │
│  - 365-day grid (like LeetCode)         │
│  - Toggle: Leads / Merchants            │
│  - Stats: Total, Active days, Most active│
├─────────────────────────────────────────┤
│  🔑 Change Password                     │
├─────────────────────────────────────────┤
│  🏆 Leaderboard                         │
│  - Top 20 players in your branch        │
└─────────────────────────────────────────┘
```

---

## 🎯 WHAT YOU'LL SEE

### **Streak Tracker Component:**

```
┌──────────────────────────────────────────┐
│ 🔥 14-Day Streak!              🛡️ 1    │
│ Last activity: Today                     │
│                                          │
│ Next milestone: 21 days                  │
│ ████████████░░░░░░  7 days to go      │
│                                          │
│ ┌────────────┬────────────┐             │
│ │ 🏆 Best    │ 🔥 Current  │             │
│ │ 27 days    │ 14 days     │             │
│ └────────────┴────────────┘             │
│                                          │
│ Milestones:                              │
│ ✓ 7  ✓ 14  ○ 21  ○ 30  ○ 50           │
│                                          │
│ 💡 Earn a freeze shield every 10 days!  │
└──────────────────────────────────────────┘
```

### **Activity Heatmap Component:**

```
┌──────────────────────────────────────────┐
│ Activity Heatmap (365 days)   [Leads] [Merchants]│
│                                          │
│ Total: 42 merchants | Active: 28/365 days│
│ Most active day: 2024-03-15 (5)         │
│                                          │
│ Jan  Feb  Mar  Apr  ...                 │
│ ⬜🟩🟩⬜🟩🟩🟩🟩⬜🟩 ...                 │
│ 🟩🟩🟩🟩⬜🟩🟩🟩🟩🟩 ...                 │
│ 🟩⬜🟩🟩🟩🟩🟩⬜🟩🟩 ...                 │
│                                          │
│ Less ⬜🟩🟩🟩🟩 More                     │
└──────────────────────────────────────────┘
```

---

## 🚀 HOW TO GET YOUR FIRST STREAK

### **Step 1: Login as Player**

```
Email: player@example.com
Password: DevPassword1!
```

### **Step 2: Create Your First Lead**

1. Go to **Scout** section
2. Click **"Create Lead"**
3. Fill in lead details
4. Submit

**What happens:**

- ✅ Streak starts: 1 day
- ✅ Activity heatmap shows 1 green square
- ✅ Popup notification: "First Steps!"
- ✅ Achievement unlocked: +50 XP

### **Step 3: Come Back Tomorrow & Create Another**

- ✅ Streak becomes: 2 days
- ✅ Another green square on heatmap
- ✅ If you reach 7 days → Milestone celebration!
- ✅ If you reach 10 days → Earn 1 freeze shield!

---

## 🎮 STREAK MILESTONES

| Days | Reward             | What Happens                        |
| ---- | ------------------ | ----------------------------------- |
| 1    | Start streak       | Fire icon appears                   |
| 7    | Weekly Warrior     | 🎉 Popup celebration + Achievement  |
| 10   | First Shield       | 🛡️ Earn 1 freeze shield             |
| 14   | Bi-Weekly Champion | 🎉 Popup + Achievement              |
| 21   | Three Week Streak  | 🎉 Popup + Achievement              |
| 30   | Monthly Master     | 🎉 Popup + Achievement + 2nd Shield |
| 50   | Half Century       | 🎉 Popup + Achievement              |
| 100  | Legendary          | 🎉 Popup + Achievement + 3rd Shield |
| 365  | Unstoppable!       | 🏆 Ultimate Achievement             |

---

## 🛡️ FREEZE SHIELDS EXPLAINED

**What are they?**

- Protection for your streak
- Auto-used if you miss a day

**How to earn them:**

- Every 10 days of streak = 1 shield
- Maximum 3 shields stored at once

**Example:**

```
Day 1-9: Active every day → Streak = 9
Day 10: Still active → Streak = 10, Earn 1 shield 🛡️
Day 11: Forgot to log in → Shield auto-used!
Day 12: Back online → Streak still = 11 (protected!)
```

---

## 📊 HEATMAP COLOR GUIDE

### **For Leads View:**

| Color               | Meaning         | Leads That Day |
| ------------------- | --------------- | -------------- |
| ⬜ Gray             | Inactive        | 0 leads        |
| 🟩 Light Green      | Low activity    | 1-2 leads      |
| 🟩🟩 Medium Green   | Medium activity | 3-5 leads      |
| 🟩🟩🟩 Dark Green   | High activity   | 6-10 leads     |
| 🟩🟩🟩🟩 Lime Green | LEGENDARY       | 11+ leads      |

### **For Merchants View:**

| Color               | Meaning         | Merchants That Day |
| ------------------- | --------------- | ------------------ |
| ⬜ Gray             | Inactive        | 0 merchants        |
| 🟩 Light Green      | Low activity    | 1-2 merchants      |
| 🟩🟩 Medium Green   | Medium activity | 3-5 merchants      |
| 🟩🟩🟩 Dark Green   | High activity   | 6-10 merchants     |
| 🟩🟩🟩🟩 Lime Green | LEGENDARY       | 11+ merchants      |

---

## 🎯 QUICK CHECKLIST

After logging in as player:

- [ ] Go to Profile page
- [ ] See Streak Tracker with fire icon 🔥
- [ ] See Activity Heatmap with green squares
- [ ] Create 1 lead
- [ ] Check streak shows "1-Day Streak!"
- [ ] Check heatmap shows 1 green square
- [ ] Come back tomorrow
- [ ] Create another lead
- [ ] Check streak shows "2-Day Streak!"
- [ ] Keep going to reach 7-day milestone! 🎉

---

## 💡 TIPS FOR MAXIMUM ENGAGEMENT

1. **Check your streak every morning**
   - Motivates you to stay active

2. **Aim for milestones**
   - Next one always visible on progress bar

3. **Use freeze shields wisely**
   - They auto-protect you, but only have 3 max

4. **Compete on leaderboard**
   - See who's ahead, try to catch up

5. **Complete daily challenges**
   - Extra XP + satisfaction

6. **Reveal scratch cards**
   - Instant rewards when you induct merchants

---

## 🔧 TROUBLESHOOTING

### **Don't see Streak Tracker?**

- Make sure you're logged in as PLAYER, BRANCH_MANAGER, or ADMIN
- Try refreshing the page
- Check browser console for errors

### **Streak shows 0?**

- You haven't created any leads/merchants yet
- Create your first lead to start the streak!

### **Heatmap is all gray?**

- No activity recorded yet
- Create some leads/merchants and they'll turn green

### **Don't see notifications?**

- Make sure `PersistentNotificationPopup` is added to `layout.tsx`
- Check if notifications table has data

---

## 🎉 ENJOY YOUR GAMIFIED EXPERIENCE!

You now have:

- ✅ LeetCode-style heatmap showing your activity
- ✅ Streak tracker with fire animation
- ✅ Freeze shields to protect your streak
- ✅ Milestone celebrations
- ✅ Achievement unlocks
- ✅ Scratch card rewards
- ✅ Daily challenges
- ✅ Leaderboard rankings

**This will make you ADDICTED to merchant onboarding!** 🚀
