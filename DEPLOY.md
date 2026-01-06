Deploy options for Connect4

Option A — Single service (Render) — serves backend + static frontend

- Configure Render to create a new Web Service from this GitHub repo.
- Set the "Root Directory" to `/` (repo root) or to `backend` and run a build step that builds the frontend into `frontend/dist`.
- Recommended Render settings (repo root):
  - Build Command: `npm --prefix frontend install && npm --prefix frontend run build`
  - Start Command: `node backend/index.js`
  - Render will provide `PORT` automatically; `backend/index.js` respects `process.env.PORT`.
- Render will serve the built frontend from `frontend/dist` and the API at `/ai/move`.

Option B — Frontend on Vercel, Backend on Render (recommended for simple CI/CD separation)

- Backend (Render):
  - Create a new Web Service on Render for the repo and set the "Root Directory" to `backend`.
  - Build Command: `npm install`
  - Start Command: `node index.js`
  - Ensure CORS is permitted (the backend currently uses `cors()` to allow all origins). Render provides the service URL like `https://your-backend.onrender.com`.
- Frontend (Vercel):
  - In Vercel, import your GitHub repo and set the Root Directory to `frontend`.
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Add Environment Variable: `VITE_API_URL = https://your-backend.onrender.com` (if you plan to call the backend from the frontend).
  - Deploy; Vercel will host the static frontend with HTTPS.

Local testing

- Install dependencies and run locally:

```powershell
# from repo root
npm --prefix frontend install
npm --prefix backend install
npm --prefix frontend run dev    # run frontend dev server
node backend/index.js            # run backend locally (port 3000 by default)
```

Notes

- The backend API endpoint is `POST /ai/move` and accepts `{ board, player }` JSON.
- Currently the frontend implements its own AI in-browser; if you want the frontend to call the backend AI, update calls to use `import.meta.env.VITE_API_URL` (Vite env) and POST to `${import.meta.env.VITE_API_URL || ''}/ai/move`.
- If you want, I can add a small helper in the frontend to call the backend AI and a README snippet for Vercel+Render with screenshots.
