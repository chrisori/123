# Wagtail Pet Supplies

Files: index.html, style.css, app.js, schema.sql, supabase/functions/create-checkout/index.ts

## Setup
1. Create a project at supabase.com. In SQL Editor, run schema.sql.
2. Project Settings > API: copy the URL and anon key into the top of app.js.
3. Create a PayMongo account (paymongo.com) and copy your test secret key (sk_test_...).
4. Deploy the payment function:
   supabase functions deploy create-checkout
   supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx SITE_URL=https://your-site-url
5. Host the 3 front-end files (Netlify, Vercel, GitHub Pages) or open index.html locally (set SITE_URL to match).
6. Test with PayMongo test cards/GCash sandbox, then switch to live keys.

Next step: add a PayMongo webhook (event checkout_session.payment.paid) to set orders.status = 'paid'.
Without a webhook, orders stay "pending" in the database.
