# How to Find Your Supabase Service Role Key

## Yes, you NEED it - the backend won't start without it!

The `SUPABASE_SERVICE_ROLE_KEY` is required for the backend to access your Supabase database.

## Step-by-Step Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Log in if needed

2. **Select your project**
   - Click on your project (should be `dxxtxdyrovawugvvrhah`)

3. **Navigate to API Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **API** in the settings menu

4. **Find the Service Role Key**
   - Scroll down to the **API Keys** section
   - Look for **`service_role`** key
   - It will be labeled as "secret" (not "anon" or "public")
   - It starts with `eyJ...` (it's a JWT token)
   - Click the **eye icon** or **"Reveal"** button to show it (you may need to enter your password)

5. **Copy the key**
   - Click the copy button next to the key
   - Or manually select and copy it

6. **Add to your `.env` file**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   (Replace with your actual key)

### Option 2: Using Supabase CLI (If you have it installed)

```bash
supabase projects api-keys --project-ref dxxtxdyrovawugvvrhah
```

## What the Key Looks Like

The service role key is a JWT token that looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4eHR4ZHlyb3Zhd3VndnZyaGFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTYxMjEyOSwiZXhwIjoyMDQ1MTg4MTI5fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

It's much longer than the anon key and should be kept **SECRET** - never commit it to git!

## Important Notes

- **DO NOT** use the `anon` key - it won't work for backend operations
- The service role key **bypasses Row Level Security (RLS)** - that's why we need it
- Keep it secret - never share it publicly or commit it to version control
- If you can't find it, you might need to check if you have the right permissions on the project

## Troubleshooting

**Can't see the service_role key?**
- Make sure you're logged in as the project owner
- Check if you have admin access to the project
- Try refreshing the page

**Still having issues?**
- Contact Supabase support: https://supabase.com/support
- Or check the Supabase documentation: https://supabase.com/docs/guides/api/api-keys

