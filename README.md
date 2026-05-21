# 🥗 NutriScan — Smart Nutritional Tracking System

> A full-stack MERN application for personalized nutrition tracking, built as a Personal Project.  
> **NSUT · Instrumentation & Control Engineering**  
> Kunal Singh 

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
