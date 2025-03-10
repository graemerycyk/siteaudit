# SiteAudit - Free Building Site Auditing tool with Advertising for monetizing

A full-stack web application built with Next.js and Supabase that serves three main purposes:
1. A marketing website
2. A site audit tool
3. An advertisement selling module

## Features

### Marketing Website
- Responsive landing page with hero section
- "Trusted By" section showcasing customer logos
- Features and services overview
- Call-to-action sections

### Site Audit Tool
- Camera capture using HTML5 `<video>` and `navigator.mediaDevices.getUserMedia`
- Image annotation with HTML5 `<canvas>`
- PDF report generation with jsPDF
- Session-based (no external data persistence)

### Advertisement Selling Module
- Ad submission form with image upload
- Stripe payment integration
- Admin interface for managing advertisements
- Display of active ads on the website

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Payment Processing**: Stripe
- **PDF Generation**: jsPDF
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account
- Stripe account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Supabase Setup

1. Create a new Supabase project
2. Create the following tables:

**advertisements**
```sql
CREATE TABLE advertisements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  duration_id TEXT NOT NULL,
  duration_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  payment_amount NUMERIC,
  payment_date TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Create a storage bucket named `advertisements` with public access

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/siteaudit.git
cd siteaudit
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is configured for deployment on Vercel:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel:
   - Go to [Vercel](https://vercel.com) and sign in
   - Click "Add New" > "Project"
   - Import your GitHub repository
   - Select the "Next.js" framework preset

3. Configure the environment variables in the Vercel dashboard:
   - In your project settings, go to "Settings" > "Environment Variables"
   - Add the following environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_SECRET_KEY`

4. Deploy your application:
   - Click "Deploy" to start the deployment process
   - Vercel will build and deploy your application

### Troubleshooting Deployment Issues

If you encounter build errors during deployment:

1. **Stripe or Supabase Connection Issues**: 
   - Ensure all environment variables are correctly set in your Vercel project settings
   - Double-check that there are no typos in your environment variable values
   - Make sure you're using the correct API keys from your Supabase and Stripe dashboards

2. **Build Errors**: 
   - Check that your Supabase tables and storage buckets are properly set up according to the instructions above
   - Verify that the Supabase storage bucket has public access enabled

3. **API Route Errors**: 
   - The application is designed to handle cases where Stripe or Supabase clients are not initialized, but you must ensure the environment variables are correctly set for production
   - Check the Vercel deployment logs for specific error messages

4. **Image Loading Issues**: 
   - Make sure your Supabase storage bucket has the correct permissions and that the URLs are accessible
   - Verify that the storage bucket policy allows public access for reading files

5. **Next.js Client Component Issues**:
   - If you see errors about `useSearchParams()` needing to be wrapped in a Suspense boundary, make sure all components using this hook are properly wrapped with `<Suspense>` as shown in the success page
   - For other client-side hooks like `useRouter()`, follow the same pattern of wrapping the component with Suspense
   - Read more about this requirement in the [Next.js documentation](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)

## Project Structure

```
siteaudit/
├── public/              # Static assets
│   └── logos/           # Customer logos
├── src/
│   ├── app/             # Next.js app router
│   │   ├── admin/       # Admin pages
│   │   ├── advertise/   # Advertisement pages
│   │   ├── api/         # API routes
│   │   └── audit/       # Site audit tool
│   ├── components/      # Reusable components
│   └── lib/             # Utility functions and clients
└── ...
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
