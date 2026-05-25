# Battlefield Tracker

This repository contains the Battlefield Tracker project (frontend in `client/` and server code in `server/`).

Quick goals:
- Deploy the frontend to Vercel (static site from `client/`).
- Host the backend as a separate Node service (Railway, Render, or similar) and set the frontend `VITE_API_URL` env var.

Getting started (local)
1. Install dependencies:
   ```powershell
   npm install
   cd client
   npm install
   ```
2. Run frontend + backend for local development (in separate terminals):
   ```powershell
   # from repo root (starts backend dev server)
   npm run dev:win

   # frontend (if needed separately)
   cd client
   npm run dev
   ```

Geolocation notes
- Browsers require a secure origin (HTTPS) for the Geolocation API when accessed from other devices on the LAN. For testing on a phone or different device, either:
  - Use `ngrok` or `localtunnel` to expose the local dev server over HTTPS, or
  - Create locally-trusted certs with `mkcert` and run Vite with HTTPS.

Deploy frontend to Vercel
1. Go to https://vercel.com and import this GitHub repository.
2. During import, set the following:
   - Root Directory: `client`
   - Framework: `Other` or `Vite`
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in the Vercel project settings:
   - `VITE_API_URL` = `https://<your-backend-url>` (where your backend will be hosted)

Backend hosting
- Recommended hosts: Railway, Render, or Fly. Deploy the `server/` code as a Node app and get an HTTPS URL.
- Set `VITE_API_URL` in the Vercel project to point to that backend URL.

Repository notes
- The frontend is in the `client/` folder and built with Vite.
- The server is a Node/Express app in the `server/` folder.

If you want, I can:
- Create the Vercel project for you (requires Vercel account access), or
- Add a small `deploy.sh` or GitHub Actions workflow to automate frontend builds.
