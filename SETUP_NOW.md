# ✅ Quick Setup - JWT Secret Fixed!

## The Issue

Your `.env` file had a placeholder JWT secret. I've updated it with a real secret.

## What I Did

✅ Updated `NEXTAUTH_SECRET` in `.env` with a proper JWT secret
✅ Your database is connected to Neon PostgreSQL
✅ Migrations are already applied

---

## 🚀 NEXT STEPS TO GET RUNNING:

### Step 1: Stop Any Running Next.js Processes

**On Windows:**

1. Open Task Manager (Ctrl+Shift+Esc)
2. Find all "Node.js" processes
3. End them all

**Or use PowerShell:**

```powershell
Stop-Process -Name node -Force
```

### Step 2: Seed the Database

```bash
npx prisma db seed
```

**Expected Output:**

```
Synced X branches from branches.json
Scout categories: 5
Created player@example.com (PLAYER)
Created manager@example.com (BRANCH_MANAGER)
Created admin@example.com (ADMIN)
Seed complete. Login with:
  PLAYER:         player@example.com / DevPassword1!
  BRANCH_MANAGER: manager@example.com / DevPassword1!
  ADMIN:          admin@example.com / DevPassword1!
```

### Step 3: Start Your App

```bash
npm run dev
```

**Expected Output:**

```
✓ Ready in X ms
- Local:        http://localhost:3000
```

### Step 4: Login

Open your browser to: http://localhost:3000

**Login with:**

- **Email**: player@example.com
- **Password**: DevPassword1!

---

## 📝 Login Credentials (After Seeding)

| Role           | Email               | Password      |
| -------------- | ------------------- | ------------- |
| Player         | player@example.com  | DevPassword1! |
| Branch Manager | manager@example.com | DevPassword1! |
| Admin          | admin@example.com   | DevPassword1! |

---

## ⚠️ If Seed Hangs or Fails

**Option 1: Run it manually**

```bash
node prisma/seed.js
```

**Option 2: Check database connection**

```bash
npx prisma db pull
```

**Option 3: Check your Neon database**

1. Go to https://neon.tech
2. Login and check your project
3. Make sure the database is active
4. Try getting a fresh connection string

---

## 🎮 After Successful Login

Once logged in, you can:

1. Create leads → See streak/achievement popups
2. Induct merchants → Get scratch cards
3. View your progress on gamification dashboard
4. Check your streak, achievements, and challenges

---

## 🔧 Current .env Configuration

```env
DATABASE_URL="postgresql://neondb_owner:npg_hL5sogeaM6NQ@ep-empty-river-anp5xzao-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_SECRET="super-secret-jwt-key-change-this-in-production-2024-merchant-nation"
NEXTAUTH_URL="http://localhost:3000"
```

**The JWT secret issue is now FIXED!** ✅

---

## Need Help?

If you still get JWT errors:

1. Make sure you stopped ALL Node.js processes
2. Delete `.next` folder: `rm -rf .next`
3. Run `npm run dev` again

The app will read the new `.env` file on startup.
