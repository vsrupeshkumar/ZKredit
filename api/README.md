# Zkredit - Minimal API for Vercel

This is a **minimal API** designed specifically for Vercel deployment. It excludes all heavy AI/ML dependencies to stay under Vercel's 250MB serverless function limit.

## What's Included

- Basic FastAPI endpoints
- Health check
- Minimal stats endpoint
- CORS support

## What's NOT Included

- AI agents (CrewAI, LangChain)
- Heavy ML dependencies
- Full backend features
- WebSocket support (limited on Vercel)

## Deployment

```bash
vercel --prod
```

This API is automatically routed from `/api/*` by the root `vercel.json`.

## For Full Features

Deploy the full backend to:
- **Railway** (recommended): https://railway.app
- **Render**: https://render.com  
- **Fly.io**: https://fly.io

The full backend includes:
- AI-powered loan negotiation
- Real-time WebSocket support
- Complete workflow automation
- All AI agent features

## Requirements

Only minimal dependencies:
- fastapi
- pydantic
- python-dotenv
- requests

Total size: ~50MB (well under 250MB limit)

