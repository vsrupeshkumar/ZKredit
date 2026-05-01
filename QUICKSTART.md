# Zkredit - Quick Start Guide

## Running the Full Stack

### 1. Backend API Server

```bash
# Install Python dependencies
cd backend/api
pip install -r requirements.txt

# Run the FastAPI server
python server.py
```

Server will start at:
- REST API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/ws`
- API Docs: `http://localhost:8000/docs`

### 2. Frontend Dashboard

```bash
# Install npm dependencies
cd frontend/Dashboard
npm install

# Create environment file
cp .env.example .env

# Run development server
npm run dev
```

Frontend will start at: `http://localhost:5173`

### 3. AI Agent (Optional)

```bash
# From project root
python agents/borrower_agent.py
```

## What to Expect

1. **Login Portal** (`http://localhost:5173/`):
   - 3D rotating HeroCube
   - Particle field background
   - Click cube or button to enter

2. **Dashboard** (`http://localhost:5173/dashboard`):
   - Floating Bento grid with glassmorphism
   - 3D pulsing Agent Status Orb
   - Real-time balance CountUp animation
   - Liquid distortion hover effects

3. **Features**:
   - 3D graphics with React Three Fiber
   - Dark/Light mode toggle (Cyber-Noir/Foggy Future palettes)
   - Real-time WebSocket updates
   - Scroll-linked 3D animations (Kasane effect)

## Troubleshooting

**Issue**: TypeScript errors in VSCode  
**Fix**: Run `npm install` and restart VSCode

**Issue**: Backend API not connecting  
**Fix**: Ensure FastAPI server is running on port 8000

**Issue**: WebSocket connection failed  
**Fix**: Check CORS settings in `backend/api/server.py`

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **3D**: React Three Fiber + Drei
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS
- **Backend**: FastAPI + WebSockets
- **AI**: CrewAI + Llama 3 (via Ollama)
