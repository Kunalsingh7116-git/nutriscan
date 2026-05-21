<div align="center">

```
███╗   ██╗██╗   ██╗████████╗██████╗ ██╗███████╗ ██████╗ █████╗ ███╗   ██╗
████╗  ██║██║   ██║╚══██╔══╝██╔══██╗██║██╔════╝██╔════╝██╔══██╗████╗  ██║
██╔██╗ ██║██║   ██║   ██║   ██████╔╝██║███████╗██║     ███████║██╔██╗ ██║
██║╚██╗██║██║   ██║   ██║   ██╔══██╗██║╚════██║██║     ██╔══██║██║╚██╗██║
██║ ╚████║╚██████╔╝   ██║   ██║  ██║██║███████║╚██████╗██║  ██║██║ ╚████║
╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

### **SMART NUTRITIONAL TRACKING SYSTEM**
*Know what you eat. Own your health.*

<br/>

[![Live Demo](https://img.shields.io/badge/🌐_LIVE_DEMO-nutriscan--w116.onrender.com-00e5a0?style=for-the-badge&labelColor=0a0e0f)](https://nutriscan-w116.onrender.com/dashboard)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white&labelColor=0a0e0f)](https://mongodb.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=0a0e0f)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0a0e0f)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-00b8d9?style=for-the-badge&labelColor=0a0e0f)](LICENSE)

<br/>

> Built because I was tired of not knowing what I was actually eating.

</div>

---

<br/>

## 💡 WHY I BUILT THIS

I kept seeing people (including myself) eating packaged food with zero idea what's actually inside it. Sure, there's a nutrition label — but nobody reads it, and even if you do, you don't know if that sodium count is dangerous *for you specifically*.

So I built **NutriScan** — a full-stack web app that lets you log what you eat, tracks your nutrients in real time, and fires an alert the moment you're approaching or exceeding safe daily limits. Personalized. Data-driven. Actually useful.

<br/>

---

## ⚡ FEATURES

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                       │
│   LOG FOOD  ──►  AUTO-CALCULATE DAILY TOTALS  ──►  ALERT IF OVER   │
│       │                      │                           │           │
│       ▼                      ▼                           ▼           │
│  CONSUMPTION DB         LIVE DASHBOARD            SMART WARNINGS    │
│  (every meal,           (charts, progress          (High Sodium,    │
│   quantity, time)        bars, weekly trends)       High Sugar...)  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

| | Feature | Description |
|-|---------|-------------|
| 🔐 | **Auth** | Secure JWT-based login & registration |
| 🧬 | **Health Profile** | Weight, height, BMI, lifestyle, allergies, medical conditions |
| 🍱 | **Food Database** | Add any product with complete nutrition facts |
| ✏️ | **Food Logging** | Log meals with quantity, date & time |
| 📊 | **Dashboard** | Weekly calorie bar chart + real-time nutrient progress |
| 🚨 | **Smart Alerts** | Auto-fires when you cross WHO daily intake limits |
| 📱 | **Mobile-first** | Bottom nav bar on phones, sidebar on desktop |

<br/>

---

## 🛠️ TECH STACK

```
┌──────────────────────────────────────────────────────────────┐
│                        NUTRISCAN STACK                        │
├────────────────┬─────────────────────┬────────────────────────┤
│   FRONTEND     │      BACKEND        │       DATABASE         │
│                │                     │                        │
│  React 18      │  Node.js            │  MongoDB Atlas         │
│  React Router  │  Express.js         │  Mongoose ODM          │
│  Recharts      │  JWT + bcryptjs     │  7 Collections         │
│  Custom CSS    │  REST API           │  NoSQL Documents       │
│  (zero UI lib) │                     │                        │
├────────────────┴─────────────────────┴────────────────────────┤
│                    DEPLOYED ON RENDER                          │
└──────────────────────────────────────────────────────────────┘
```

No UI component libraries. Every pixel is custom CSS — because I wanted full control over how it looks and feels.

<br/>

---

## 🗄️ DATA MODEL

**7 MongoDB collections** wired together with reference fields:

```
users ──────────────── health_profiles      (1 : 1)
users ──────────────── consumption_records  (1 : N)
users ──────────────── daily_intake         (1 : N)
users ──────────────── alerts               (1 : N)
food_products ──────── nutrition_details    (1 : 1)
food_products ──────── consumption_records  (1 : N)
```

```js
// When you log food, this happens automatically:
async function updateDailyIntakeAndAlerts(userId, date) {
  // 1. Sum up all consumption records for the day
  // 2. Update daily_intake totals
  // 3. Check against WHO limits
  // 4. Auto-generate alerts for anything exceeded
}
```

<br/>

---

## 🚨 DAILY LIMITS (WHO Guidelines)

```
  CALORIES  ████████████████████  2000 kcal / day
  SUGAR     ████████████████████    50 g / day
  SODIUM    ████████████████████  2300 mg / day
  FAT       ████████████████████    65 g / day
  PROTEIN   ████████████████████    50 g / day
```

Cross any of these → alert fires instantly, shows you exactly how much over you are.

<br/>

---

## 📁 PROJECT STRUCTURE

```
nutriscan/
│
├── 📂 server/
│   ├── 📄 index.js                    # Express + MongoDB bootstrap
│   ├── 📂 middleware/
│   │   └── 📄 auth.js                 # JWT guard
│   ├── 📂 models/                     # 7 Mongoose schemas
│   │   ├── 📄 User.js                 # age is a virtual derived field
│   │   ├── 📄 HealthProfile.js        # BMI also virtual
│   │   ├── 📄 FoodProduct.js
│   │   ├── 📄 NutritionDetails.js
│   │   ├── 📄 ConsumptionRecord.js
│   │   ├── 📄 DailyIntake.js
│   │   └── 📄 Alert.js
│   └── 📂 routes/
│       ├── 📄 auth.js
│       ├── 📄 users.js
│       ├── 📄 healthProfiles.js
│       ├── 📄 foodProducts.js
│       ├── 📄 nutrition.js
│       ├── 📄 consumption.js          # ← core logic lives here
│       ├── 📄 dailyIntake.js
│       └── 📄 alerts.js
│
├── 📂 client/src/
│   ├── 📂 context/AuthContext.js      # Global auth state (JWT)
│   ├── 📂 utils/api.js                # Axios with auto token injection
│   ├── 📂 components/Layout.js        # Sidebar + mobile bottom nav
│   └── 📂 pages/
│       ├── 📄 Dashboard.js            # Recharts + live nutrient bars
│       ├── 📄 FoodProducts.js         # Search, filter, add products
│       ├── 📄 LogFood.js              # Log meals + nutrition preview
│       ├── 📄 Alerts.js               # Alert inbox with read/unread
│       └── 📄 Profile.js              # Health stats + BMI card
│
├── 📄 .env.example
├── 📄 .gitignore
└── 📄 package.json                    # Monorepo: dev / build / start
```

<br/>

---

## 📄 LICENSE

MIT — do whatever you want with it.

<br/>

---

<div align="center">


[![Live Demo](https://img.shields.io/badge/🚀_Try_It_Live-Click_Here-00e5a0?style=for-the-badge&labelColor=0a0e0f)](https://nutriscan-w116.onrender.com/dashboard)

*if the server is slow, it's just waking up — render free tier 🙃*

</div>
