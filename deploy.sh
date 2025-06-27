#!/bin/bash

echo "🚀 Starting deployment process..."

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend
echo "🔧 Building backend..."
cd backend
npm install
npm run build
cd ..

echo "✅ Build complete!"
echo ""
echo "📋 Next steps:"
echo "1. Deploy backend to Railway/Render/Vercel"
echo "2. Get the backend URL and update VITE_API_URL"
echo "3. Deploy frontend to Cloudflare Pages"
echo "4. Set custom domain: secure-audit.nsisonglabs.xyz"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions" 