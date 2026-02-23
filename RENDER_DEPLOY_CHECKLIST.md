# 🚀 DentalPM Madagascar - Render Deployment Checklist

## Architecture
- **Backend**: Node.js/Express (`/dental-pm-mvp`)
- **Frontend**: React (`/frontend`)
- **Database**: PostgreSQL (Render managed)
- ⚠️ **Ignore**: `/backend` folder (Python/FastAPI - not used)

---

## 📋 Pre-Deployment Checklist

### 1. GitHub Repository
- [ ] Push code to GitHub via Emergent "Save to GitHub"
- [ ] Verify `.gitignore` excludes:
  - `node_modules/`
  - `.env`
  - `*.sqlite`
  - `uploads/`

### 2. Render Account Setup
- [ ] Create Render account at https://render.com
- [ ] Connect GitHub repository

---

## 🗄️ Database Setup (Render PostgreSQL)

### Create PostgreSQL Service
1. [ ] Dashboard → New → PostgreSQL
2. [ ] Name: `dentalpm-db`
3. [ ] Region: Frankfurt (EU) or closest to Madagascar
4. [ ] Plan: Free (dev) or Starter ($7/mo for production)
5. [ ] Click "Create Database"
6. [ ] Copy `Internal Database URL` for backend

---

## ⚙️ Backend Deployment (Node.js)

### Create Web Service
1. [ ] Dashboard → New → Web Service
2. [ ] Connect GitHub repo
3. [ ] Configure:
   - **Name**: `dentalpm-api`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `dental-pm-mvp`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Environment Variables (Backend)
```
DATABASE_URL        = [Internal Database URL from PostgreSQL]
DB_SSL              = true
NODE_ENV            = production
PORT                = 8001
FRONTEND_URL        = https://dentalpm-frontend.onrender.com
OPENAPI_SERVER_URL  = https://dentalpm-api.onrender.com
JWT_SECRET          = [Generate: openssl rand -hex 32]
JWT_EXPIRES_IN      = 24h
DEFAULT_CURRENCY    = MGA
DEFAULT_LOCALE      = fr-MG
MOCK_SMS_ENABLED    = true
MOCK_MOBILE_MONEY_ENABLED = true
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
```

### Health Check
- [ ] Path: `/api/health`
- [ ] Expected: `{"status":"OK",...}`

---

## 🎨 Frontend Deployment (React)

### Create Static Site
1. [ ] Dashboard → New → Static Site
2. [ ] Connect same GitHub repo
3. [ ] Configure:
   - **Name**: `dentalpm-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`

### Environment Variables (Frontend)
```
REACT_APP_BACKEND_URL = https://dentalpm-api.onrender.com
```

### Redirects (for React Router)
Create `frontend/public/_redirects`:
```
/*    /index.html   200
```

---

## 🔄 Post-Deployment

### Database Migration
1. [ ] SSH into backend or use Render Shell
2. [ ] Run: `npm run db:sync` (if available) or let Sequelize auto-sync

### Verify Deployment
- [ ] Backend health: `https://dentalpm-api.onrender.com/api/health`
- [ ] Frontend loads: `https://dentalpm-frontend.onrender.com`
- [ ] Login works with test credentials
- [ ] CORS working (no console errors)

### Update CORS (if needed)
After deployment, update `FRONTEND_URL` in backend env vars to match actual frontend URL.

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is unique and secure (32+ chars)
- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] NODE_ENV=production
- [ ] No sensitive data in GitHub repo
- [ ] Rate limiting enabled

---

## 💰 Render Pricing (Estimated)

| Service | Plan | Cost |
|---------|------|------|
| PostgreSQL | Starter | $7/mo |
| Backend (Web Service) | Starter | $7/mo |
| Frontend (Static Site) | Free | $0/mo |
| **Total** | | **~$14/mo** |

Free tier available for testing (with limitations).

---

## 📞 Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
