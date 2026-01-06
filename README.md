# Connect4

Play Connect 4 — a React + Express implementation with arcade powerups.

## Local development

Frontend

```
cd frontend
npm install
npm run dev
```

Backend (AI API)

```
cd backend
npm install
npm start
```

The frontend dev server runs (Vite) and the backend API listens on port 3000 by default.

## Build

To build the frontend for production:

```
cd frontend
npm run build
```

## Deployment notes

- Recommended hosts: Vercel or Netlify for frontend, Render or Railway for backend.
- The backend can be configured to serve the built frontend `dist` if you prefer a single host. See `backend/index.js`.

## CI / Deployment

- A basic GitHub Actions workflow is included at `.github/workflows/ci.yml` which installs dependencies and builds the frontend on push.

## Serve from backend (single host)

1. Build the frontend:

```bash
cd frontend
npm ci
npm run build
```

2. Start the backend (it will serve the built frontend from `frontend/dist`):

```bash
cd backend
npm ci
npm start
```

You can also deploy frontend separately to Vercel/Netlify and deploy the backend to Render/Railway. When deploying separately, configure the frontend to call the backend AI API URL (default `https://<your-backend>/ai/move`).

## Repository

Prepare this repository for publishing on GitHub. Add a license if desired.
