# 🎮 HOW TO SEE STREAK & LEETCODE HEATMAP AS PLAYER

## ✅ QUICK ANSWER

**Both are now on your PROFILE PAGE!**

---

## 📍 WHERE TO FIND THEM

### **Step 1: Login**
```
URL: http://localhost:3000
Email: player@example.com
Password: DevPassword1!
```

### **Step 2: Go to Profile**
- Click **"Profile"** in the navigation menu
- Or go to: http://localhost:3000/profile

### **Step 3: Scroll Down**
You'll see everything in this order:

```
1. 👤 Your Profile Card (name, rank, XP)
2. 📊 Operations Stats (zones, leads, merchants)
3. 🔥 STREAK TRACKER (NEW - shows your current streak!)
4. 🟩 ACTIVITY HEATMAP (LeetCode-style 365-day grid)
5. 🔑 Change Password
6. 🏆 Leaderboard
```

---

## 🔥 STREAK TRACKER

### **What You'll See:**

```
┌──────────────────────────────────────┐
│ 🔥 1-Day Streak!           🛡️ 0    │
│ Last activity: Today                 │
│                                      │
│ Next milestone: 7 days               │
│ ██░░░░░░░░░░░░░░░░ 6 days to go   │
│                                      │
│ ┌──────────┬──────────┐             │
│ │ 🏆 Best  │ 🔥 Current│             │
│ │ 0 days   │ 1 day    │             │
│ └──────────┴──────────┘             │
│                                      │
│ Milestones:                          │
│ ○ 7  ○ 14  ○ 21  ○ 30  ○ 50       │
│                                      │
│ 💡 Earn a freeze shield every 10    │
│    days! Use it to skip a day.      │
└──────────────────────────────────────┘
```

### **How to Start Your Streak:**
1. Create 1 lead (go to Scout section)
2. Your streak will show "1-Day Streak!"
3. Come back tomorrow and create another
4. Streak becomes 2 days, then 3, etc.

### **Milestones:**
- **7 days** → First celebration! 🎉
- **10 days** → Earn 1 freeze shield 🛡️
- **14 days** → Second celebration 🎉
- **21 days** → Third celebration 🎉
- **30 days** → Second shield + celebration 🛡️🎉
- **50 days** → Half century! 🏆
- **100 days** → Legendary! 🏆🛡️
- **365 days** → Unstoppable! 👑

---

## 🟩 LEETCODE-STYLE HEATMAP

### **What You'll See:**

```
┌──────────────────────────────────────┐
│ Activity Heatmap (365 days)          │
│                      [Leads] [Merchants]│
│                                      │
│ Total: 1 merchant | Active: 1/365    │
│ Most active day: 2024-03-31 (1)     │
│                                      │
│ Mar  Apr  May  Jun  ...             │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ ...                   │
│ ⬜⬜⬜⬜⬜🟩⬜⬜⬜⬜ ... (1 green square!) │
│ ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ ...                   │
│                                      │
│ Less ⬜🟩🟩🟩🟩 More                 │
└──────────────────────────────────────┘
```

### **Color Meaning:**
- ⬜ **Gray** = 0 activities (inactive day)
- 🟩 **Light green** = 1-2 activities
- 🟩🟩 **Medium green** = 3-5 activities
- 🟩🟩🟩 **Dark green** = 6-10 activities
- 🟩🟩🟩🟩 **Lime green** = 11+ activities (LEGENDARY!)

### **Toggle Views:**
- Click **"Leads"** button → shows leads heatmap
- Click **"Merchants"** button → shows merchants heatmap

---

## 🎯 HOW TO GET YOUR FIRST ACTIVITY

### **Option 1: Create a Lead**
1. Go to **Scout** section
2. Click on a zone on the map
3. Fill in lead details
4. Submit

**Result:**
- ✅ Streak: 1 day
- ✅ Heatmap: 1 green square for today
- ✅ Notification: "First Steps! +50 XP"

### **Option 2: Induct a Merchant**
1. Go to a lead
2. Complete merchant induction
3. Submit

**Result:**
- ✅ Streak: 1 day
- ✅ Heatmap: 1 green square for today
- ✅ Scratch card earned! 🎰
- ✅ Notification: Achievement unlocked!

---

## 📊 COMPLETE PROFILE PAGE LAYOUT

```
┌──────────────────────────────────────────┐
│  OFFICER PROFILE & RANKS      [Log out] │
├──────────────────────────────────────────┤
│                                          │
│  👤 YOUR PROFILE                         │
│  Name: Abebe                             │
│  Rank: R1 CADET                          │
│  XP: 50                                  │
│  Progress to R2: [██░░░░░░] 10%         │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  📊 OPERATIONS OVERVIEW                  │
│  ┌──────┬──────────┬──────────┐         │
│  │Zones │ Leads    │Merchants │         │
│  │  5   │   1      │    0     │         │
│  └──────┴──────────┴──────────┘         │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🔥 STREAK TRACKER (NEW!)               │
│  🔥 1-Day Streak!              🛡️ 0    │
│  Next milestone: 7 days                  │
│  [██░░░░░░░░░░░░░░░░] 6 days to go    │
│                                          │
│  Milestones: ○ 7  ○ 14  ○ 21  ○ 30    │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🟩 ACTIVITY HEATMAP                    │
│  [Leads] [Merchants]                     │
│  Total: 1 | Active: 1/365 days          │
│                                          │
│  ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜              │
│  ⬜⬜⬜⬜⬜🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜ (today!)    │
│  ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜              │
│                                          │
│  Less ⬜🟩🟩🟩🟩 More                    │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🔑 [Change Password]                    │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  🏆 BRANCH LEADERBOARD                   │
│  🥇 Meron - 2,450 XP                     │
│  🥈 Kebede - 2,200 XP                    │
│  🥉 YOU - 50 XP                          │
│  ...                                     │
│                                          │
└──────────────────────────────────────────┘
```

---

## 🚀 DAILY ROUTINE FOR MAXIMUM XP

### **Morning (9 AM):**
1. Login and check profile
2. See your streak 🔥
3. Goal: Keep it alive!

### **During Day:**
1. Scout leads in your zones
2. Each lead = +1 streak day
3. Each lead = green square on heatmap
4. Each lead = XP points

### **Evening (5 PM):**
1. Check if you completed daily challenges
2. See if you have scratch cards to reveal
3. Check leaderboard position

### **Result:**
- Consistent activity = long streak
- Long streak = achievements + shields
- Achievements = more XP
- More XP = higher rank
- Higher rank = recognition + rewards

---

## 🎮 WHAT MAKES THIS ADDICTIVE

### **1. Loss Aversion**
> "I have a 14-day streak! I CAN'T lose it now!"

### **2. Visual Progress**
> "Only 3 more green squares to reach 7-day milestone!"

### **3. Variable Rewards**
> "Maybe this scratch card will be the 500 XP jackpot!"

### **4. Competition**
> "Meron is at 2,450 XP, I'm at 2,200. I can catch her!"

### **5. Achievement Unlocks**
> "I just earned 'First Steps' badge! What's next?"

---

## 💡 TIPS

1. **Check your profile every morning** - see your streak
2. **Aim for milestones** - always know what's next
3. **Don't break the chain** - even 1 lead keeps streak alive
4. **Use freeze shields wisely** - they protect you automatically
5. **Complete daily challenges** - extra XP boost
6. **Reveal scratch cards quickly** - 24-hour expiration!

---

## 🔧 IF SOMETHING ISN'T SHOWING

### **Streak Tracker not visible?**
- Make sure you're logged in
- Refresh the page (Ctrl+F5)
- Check browser console for errors

### **Streak shows 0?**
- You haven't created any leads/merchants yet
- Create your first lead to start!

### **Heatmap all gray?**
- No activity recorded yet
- Create some leads/merchants

### **No notifications popping up?**
- Make sure dev server is running
- Check if `PersistentNotificationPopup` is in `layout.tsx`

---

## 🎉 ENJOY!

You now have a complete gamification system:
- ✅ Streak tracking with fire animation
- ✅ LeetCode-style heatmap (365 days)
- ✅ Achievement system
- ✅ Scratch cards
- ✅ Daily challenges
- ✅ Leaderboard rankings
- ✅ Freeze shields
- ✅ Milestone celebrations

**This will make merchant onboarding ADDICTIVE!** 🚀
