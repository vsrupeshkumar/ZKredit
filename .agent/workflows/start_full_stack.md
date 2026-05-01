---
description: Start the full Zkredit stack (Hydra Node + Backend + Frontend)
---

# Start Full Stack with Real Hydra Node

This workflow starts the local Cardano Devnet, Hydra Node, Backend API, and Frontend Dashboard.

## 1. Start Infrastructure (Docker)

Start the Cardano Node and Hydra Node in the background.

```bash
// turbo
docker-compose up -d
```

Wait for the nodes to sync (usually takes 10-20 seconds). You can check status with:

```bash
docker-compose ps
```

## 2. Start Backend API

Start the FastAPI server. It will automatically connect to the local Hydra node.

```bash
cd backend/api
# Install dependencies if needed
# pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

## 3. Start Frontend Dashboard

Start the React dashboard.

```bash
cd frontend/Dashboard
npm run dev
```

## 4. (Optional) Run AI Agent

Run the borrower agent (Lenny) in a separate terminal.

```bash
python agents/borrower_agent.py
```
