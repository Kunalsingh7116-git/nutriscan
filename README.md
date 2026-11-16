NutriScan

**Photo-based nutrition tracking for athletes, gym-goers, and anyone who wants to understand what they eat.**

[Live app](https://nutriscan-six-theta.vercel.app/) · [GitHub repository](https://github.com/Kunalsingh7116-git/nutriscan)

**Android APK** · `NutriScan-1.1.apk` is available locally. A public APK download is pending.

## The problem I'm solving

When you're training, tracking a meal can mean looking up every ingredient, estimating portions, and adding up calories, protein, carbs, and fat. That takes time, especially when you're doing it several times a day.

I built NutriScan to start with a meal photo and turn it into nutrition estimates you can review and adjust. Meals you eat often can be saved in your Food Library for reuse.

## The impact I want to make

I want meal tracking to take less time so it's easier to keep up with. Athletes and gym-goers can see how meals around workouts contribute to their daily totals. Anyone curious about their eating habits can see their meal history and how their calorie intake changes over the week.

## App theme

I used forest green (`#246445`), soft off-white (`#F7F9F6`), and white cards. Manrope sets the headings and DM Sans handles body text. The meal photos, portion sizes, and nutrition totals get the most space on screen so they're easy to scan on a phone.

<img src="docs/screenshots/meal-scan-review.png" width="340" alt="NutriScan meal review with food photography, nutrient totals, and portion sizes">
<img src="docs/screenshots/saved-foods.png" width="340" alt="NutriScan Food Library with a saved meal, its photo, and its calorie estimate">

## Technologies I used

- **React and Recharts** for the interface and nutrition charts
- **Node.js, Express, MongoDB, and Mongoose** for the API and data storage
- **Gemini and OpenAI** as configurable providers for photo analysis
- **Android WebView and Gradle** for the Android app
- **Vercel** for the hosted web app

*Built by Kunal Singh, an undergraduate at NSUT, as my personal open course project.*
