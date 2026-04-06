# Vercel Deployment Guide

## Prerequisites
- Vercel account (sign up at vercel.com)
- MongoDB Atlas account (for database hosting)
- Vercel CLI installed: `npm i -g vercel`

## Step 1: Prepare Your MongoDB Database
1. Create a free MongoDB Atlas account at mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/artist-portfolio`)
4. Whitelist all IPs (0.0.0.0/0) in Network Access for Vercel

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)
```bash
# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? (accept default or customize)
# - Directory? ./
# - Override settings? No
```

### Option B: Deploy via Vercel Dashboard
1. Go to vercel.com/new
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Configure project settings:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm install`
   - Output Directory: (leave empty)

## Step 3: Configure Environment Variables
In your Vercel project dashboard, go to Settings > Environment Variables and add:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
NODE_ENV=production
```

Or via CLI:
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV
```

## Step 4: Redeploy
After adding environment variables, redeploy:
```bash
vercel --prod
```

## Important Notes

### File Uploads
Vercel's serverless functions have a 4.5MB request body limit. For larger images:
- Consider using a cloud storage service (AWS S3, Cloudinary, etc.)
- Or use Vercel Blob Storage: https://vercel.com/docs/storage/vercel-blob

### Database
- The file-based `database.json` won't work on Vercel (serverless is stateless)
- You MUST use MongoDB or another hosted database
- Make sure to run your setup script to initialize the database

### Serverless Functions
- Each API route runs as a serverless function
- Functions have a 10-second execution timeout on Hobby plan
- Functions are stateless (no persistent file system)

## Testing Locally with Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Run locally with Vercel environment
vercel dev
```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `node_modules` is in `.vercelignore`

### API Routes Not Working
- Verify `vercel.json` routes configuration
- Check environment variables are set
- Review function logs in Vercel dashboard

### Database Connection Issues
- Verify MongoDB connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database user has proper permissions

## Your URLs After Deployment
- Frontend: `https://your-project.vercel.app`
- Admin Panel: `https://your-project.vercel.app/admin`
- API: `https://your-project.vercel.app/api/*`

## Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Navigate to Domains
3. Add your custom domain
4. Update DNS records as instructed
