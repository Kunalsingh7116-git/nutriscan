# 🥗 NutriScan — Smart Nutritional Tracking System

> A full-stack MERN application for personalized nutrition tracking, built as a DBMS Minor Project.  
> **NSUT · Department of Instrumentation & Control Engineering**  
> Nandini Singh · Kunal Singh · Gunika Anand

---

## Features

- **User Authentication** — JWT-based register/login
- **Health Profile** — BMI, lifestyle, medical conditions, allergies
- **Food Products DB** — Add products with full nutrition facts
- **Food Logging** — Log consumption with quantity/time; auto-calculates daily totals
- **Smart Alerts** — Auto-generated warnings when daily limits are exceeded
- **Dashboard** — Weekly calorie chart, nutrient progress bars, recent logs
- **MongoDB Atlas** — All 7 collections from the project ER diagram

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router v6, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT + bcryptjs |
| Styling | Custom CSS (no UI library) |

---

## Project Structure

```
nutriscan/
├── server/
│   ├── index.js              # Express entry point
│   ├── middleware/auth.js    # JWT middleware
│   ├── models/               # Mongoose models (7 collections)
│   │   ├── User.js
│   │   ├── HealthProfile.js
│   │   ├── FoodProduct.js
│   │   ├── NutritionDetails.js
│   │   ├── ConsumptionRecord.js
│   │   ├── DailyIntake.js
│   │   └── Alert.js
│   └── routes/               # REST API routes
│       ├── auth.js
│       ├── users.js
│       ├── healthProfiles.js
│       ├── foodProducts.js
│       ├── nutrition.js
│       ├── consumption.js
│       ├── dailyIntake.js
│       └── alerts.js
├── client/
│   └── src/
│       ├── context/AuthContext.js
│       ├── utils/api.js
│       ├── pages/            # Dashboard, FoodProducts, LogFood, Alerts, Profile
│       └── components/       # Layout (sidebar)
├── .env.example
├── .gitignore
└── package.json
```

---

## Quick Start (Local)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/nutriscan.git
cd nutriscan
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/NutriScanDB
JWT_SECRET=your_secret_key_here
PORT=5000
NODE_ENV=development
```

### 3. Install dependencies

```bash
npm run install-all
```

### 4. Run in development

```bash
npm run dev
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:5000

---

## MongoDB Atlas Setup

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create free cluster
2. Database Access → Add user with read/write permissions
3. Network Access → Add IP `0.0.0.0/0` (allow all) for development
4. Connect → Driver → Copy connection string → paste in `.env`

Collections created automatically on first use:
`users`, `health_profiles`, `food_products`, `nutrition_details`, `consumption_records`, `daily_intake`, `alerts`

---

## Deployment

### Option A — Render (Free, Recommended)

1. Push code to GitHub (see below)
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `npm run install-all && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables (MONGODB_URI, JWT_SECRET, NODE_ENV=production)
6. Deploy — Render gives you a free `*.onrender.com` URL

### Option B — Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set MONGODB_URI=... JWT_SECRET=...
```

### Option C — Heroku

```bash
heroku create nutriscan-app
heroku config:set MONGODB_URI=... JWT_SECRET=... NODE_ENV=production
git push heroku main
```

---

## Push to GitHub

```bash
# In the nutriscan folder:
git init
git add .
git commit -m "feat: initial NutriScan implementation"

# Create repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/nutriscan.git
git branch -M main
git push -u origin main
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/users/me` | Get current user |
| GET/PUT | `/api/health-profiles` | Health profile CRUD |
| GET/POST | `/api/food-products` | List/add products |
| POST/GET/DELETE | `/api/consumption` | Log/fetch/delete food |
| GET | `/api/daily-intake` | Daily nutrition totals |
| GET/PATCH | `/api/alerts` | Alerts + mark read |

All routes except auth require `Authorization: Bearer <token>` header.

---

## Daily Intake Limits (WHO Guidelines)

| Nutrient | Limit |
|----------|-------|
| Calories | 2000 kcal |
| Sugar | 50 g |
| Sodium | 2300 mg |
| Fat | 65 g |
| Protein | 50 g |

Alerts are auto-generated when any limit is exceeded.

---

## License

MIT — Free to use and modify for academic purposes.
