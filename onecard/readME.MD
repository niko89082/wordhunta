# OneCard - Phase 1 Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account
- Git

## 1. Install Dependencies

Add these packages to your project:

```bash
npm install qrcode jsqr
npm install --save-dev @types/qrcode @types/jsqr
```

## 2. Supabase Setup

### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### Configure Phone Auth
1. Go to Authentication > Providers
2. Enable Phone provider
3. Choose SMS provider:
   - **Option A**: Use Twilio
     - Add Twilio Account SID, Auth Token, and Messaging Service SID
   - **Option B**: Use Supabase managed (if available in your region)

### Run Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy the entire schema from `Database Schema & RLS Policies` artifact
3. Run the SQL script
4. Verify all tables are created

## 3. Environment Variables

Create `.env.local` in your project root:

```bash
# Get these from Supabase > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Get this from Supabase > Settings > API (service_role key - keep secret!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. File Structure

Create these files in your Next.js project:

```
src/
├── app/
│   ├── login/page.tsx                    # Customer login (phone)
│   ├── wallet/page.tsx                   # Customer wallet
│   ├── redeem/[id]/page.tsx             # Redeem reward page
│   ├── biz/
│   │   ├── login/page.tsx               # Business login
│   │   ├── page.tsx                     # Business dashboard
│   │   └── [id]/
│   │       ├── staff/page.tsx           # Staff scanner
│   │       ├── program/page.tsx         # Program settings
│   │       ├── rewards/page.tsx         # Rewards management
│   │       └── ledger/page.tsx          # Transaction ledger
│   └── api/
│       ├── earn/route.ts                # POST - credit points
│       └── redeem/
│           ├── issue/route.ts           # POST - issue redeem token
│           └── consume/route.ts         # POST - consume redeem token
├── components/
│   ├── qr/CustomerQR.tsx                # QR code display
│   └── scan/CameraScanner.tsx           # Camera scanner
└── lib/
    └── supabase.ts                      # Already exists (provided)
```

## 5. Create Initial Business Account

After setup, you'll need to create the first business account manually:

1. Go to Supabase > Authentication > Users
2. Click "Add user" > Email
3. Enter email and password (this will be your business owner account)
4. Note the user ID

5. Go to SQL Editor and run:
```sql
-- Replace YOUR_EMAIL and YOUR_USER_ID
INSERT INTO business_users (business_id, email, role)
SELECT id, 'YOUR_EMAIL', 'owner'
FROM businesses
WHERE owner_user_id = 'YOUR_USER_ID';
```

OR use the signup flow in the app once built.

## 6. Run the App

```bash
npm run dev
```

Visit:
- Customer login: http://localhost:3000/login
- Business login: http://localhost:3000/biz/login

## 7. Test the Flow

### As Business Owner:
1. Login at `/biz/login`
2. Create a business
3. Set earn rate in Program Settings (default: 5 pts/$1)
4. Create rewards (e.g., "Free Coffee" for 50 pts)
5. Go to Staff Terminal

### As Customer:
1. Login at `/login` with your phone number
2. Receive and enter OTP code
3. View wallet (empty at first)
4. Show your QR code

### Staff Scanner Test:
1. On staff terminal, click "Open Camera"
2. Scan customer QR code (or use phone lookup)
3. Enter bill amount (e.g., $10.00)
4. Credit points
5. Customer refreshes wallet to see new balance

### Redeem Test:
1. Customer taps on a reward they can afford
2. Click "Generate Redeem Code"
3. Show QR to staff
4. Staff scans redeem QR
5. Points deducted, reward consumed

## 8. Troubleshooting

### Phone OTP not working
- Check Twilio credentials are correct
- Verify phone number format: +1XXXXXXXXXX
- Check Supabase logs for SMS errors
- Fallback: Use email magic link temporarily

### Camera not working
- HTTPS required for camera (localhost works)
- Grant camera permissions in browser
- Use phone number lookup as fallback

### RLS Policy Errors
- Verify user is authenticated
- Check business_users table has correct email entries
- Review Supabase logs for policy violations

### Points not crediting
- Check SUPABASE_SERVICE_ROLE_KEY is set
- Verify program is active for the business
- Check API route logs in terminal

## 9. Next Steps (Phase 1.1)

After core MVP works:
- Add loading states and skeletons
- Add toasts for success/error messages
- Rate limiting on API routes
- Better error handling
- "Are you sure?" prompts on critical actions

## 10. Production Checklist

Before deploying:
- [ ] Change all environment variables
- [ ] Enable RLS on all tables
- [ ] Set up proper CORS if needed
- [ ] Configure production domain in Supabase
- [ ] Test on real mobile devices
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Add rate limiting
- [ ] Set up backup strategy
- [ ] Configure PWA manifest for installability