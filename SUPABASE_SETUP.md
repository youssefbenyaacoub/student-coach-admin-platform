# Supabase Setup Guide for SEA Platform

This guide will help you connect your React application to Supabase.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: SEA Platform (or your choice)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click the **Settings** icon (gear) in the sidebar
2. Click **API** in the settings menu
3. You'll see:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API keys**:
     - `anon` `public` key (safe to use in client-side code)

4. Copy these values

## Step 3: Configure Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file
4. **Restart your development server** (`npm run dev`)

## Step 4: Create Database Tables

1. In your Supabase dashboard, click **SQL Editor** in the sidebar
2. Click **New Query**
3. Copy the entire content of `supabase-schema.sql` from your project root
4. Paste it into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)
6. Wait for the query to complete (you should see "Success" messages)

## Step 5: Set Up Authentication

Supabase authentication is already configured in your React app, but you need to decide how users will log in:

### Option A: Email/Password Authentication (Recommended for testing)

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Make sure **Email** is enabled
3. **Disable email confirmations** for testing:
   - Go to **Authentication** > **Settings**
   - Uncheck "Enable email confirmations"
   - Save

### Option B: Magic Link Authentication

1. Keep email confirmations enabled
2. Users will receive a magic link via email to log in

## Step 6: Create Test Users

Since we're using Supabase Auth, you need to create users in two places:

### Method 1: Using Supabase Dashboard

1. Go to **Authentication** > **Users**
2. Click **Add user**
3. Enter email and password
4. Click **Create user**
5. Copy the user's UUID

Then add user details to the `users` table:

1. Go to **Table Editor** > **users**
2. Click **Insert** > **Insert row**
3. Fill in:
   - **id**: Paste the UUID from the auth user
   - **role**: 'student', 'coach', or 'admin'
   - **name**: Full name
   - **email**: Same as auth email
   - Other fields as needed
4. Click **Save**

### Method 2: Using SQL (Easier for multiple users)

Run this in **SQL Editor**:

```sql
-- Create an admin user
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@sea.local',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Get the ID of the user we just created
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'admin@sea.local'
)
INSERT INTO users (id, role, name, email, department, title)
SELECT 
  id,
  'admin',
  'Admin User',
  'admin@sea.local',
  'Innovation Office',
  'Platform Administrator'
FROM new_user;
```

## Step 7: Update Your App to Use Supabase

You have two context files:
- `src/context/DataContext.jsx` (uses mock/localStorage)
- `src/context/DataContextSupabase.jsx` (uses Supabase)

To switch to Supabase:

1. Open `src/main.jsx`
2. Change the import:

**Before:**
```jsx
import { DataProvider } from './context/DataContext'
```

**After:**
```jsx
import { DataProvider } from './context/DataContextSupabase'
```

3. Save and restart your dev server

## Step 8: Update Login Page

The AuthContext has been updated to use Supabase authentication, but your Login page needs updating too.

Open `src/pages/auth/Login.jsx` and update the login form to use email/password instead of selecting from a list.

Example:
```jsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')

const onSubmit = async (e) => {
  e.preventDefault()
  setBusy(true)
  try {
    const result = await login({ email, password })
    if (result.success) {
      push({ type: 'success', title: 'Welcome', message: 'Signed in successfully' })
    } else {
      push({ type: 'error', title: 'Error', message: result.error })
    }
  } finally {
    setBusy(false)
  }
}
```

## Step 9: Test Your Connection

1. Start your development server: `npm run dev`
2. Open the browser console (F12)
3. Try to log in with your test credentials
4. Check the console for any errors
5. If successful, you should see data loaded from Supabase!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you've created `.env` file
- Restart your dev server after editing `.env`

### "Failed to fetch"
- Check your Supabase project URL is correct
- Check your internet connection
- Verify your project is active in Supabase dashboard

### "Invalid API key"
- Double-check you copied the **anon/public** key, not the service_role key
- Make sure there are no extra spaces in your `.env` file

### "Row Level Security policy violation"
- The schema includes basic RLS policies
- You may need to adjust them based on your security requirements
- Go to **Authentication** > **Policies** to view/edit

## Next Steps

1. Populate your database with real data using the Table Editor or SQL inserts
2. Customize RLS policies for production security
3. Set up email templates in **Authentication** > **Email Templates**
4. Consider adding storage buckets for file uploads (profile pictures, deliverable files)
5. Set up realtime subscriptions for live updates

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
