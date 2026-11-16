# NutriScan

NutriScan is a nutrition tracker I built for athletes, people who train at the gym, and anyone who wants a clearer view of what they eat.

- **Live website:** [PLACEHOLDER — Add your public deployment URL]
- **Android APK:** [PLACEHOLDER — Add the GitHub Release or APK download URL]

## Why I built it

Tracking meals can take time, especially when you're trying to keep track of calories, protein, carbs, and fat around a training schedule. Looking up every food and portion by hand can make it harder to log meals consistently.

I built NutriScan around a simple workflow: take a photo, review the app's nutrition estimates, and log the meal. I added a Food Library so you can save and reuse meals you eat often. That makes it useful whether you're tracking meals around workouts or just want to see what you eat from day to day.

## What you can do

- **Log meals from a photo or enter them manually.** Review the foods and portion estimates before saving.
- **Reuse meals from your Food Library.** Save a meal's photo and nutrition details, then search for it by name or ingredient and log it again.
- **See your meals and daily totals.** Meal History shows the original photo when available. The dashboard shows daily nutrition and a seven-day calorie trend.
- **Keep a health profile.** Save your height, weight, activity level, allergies, and health conditions.

## See it in action

These screenshots use a demo meal and a test account.

### 1. Review a meal photo

Open **Food log** and take or upload a photo. Check the foods, portions, and nutrition estimates. You can also select **Try an example scan** to see the review screen.

![NutriScan meal review with a bowl photo, portions, and nutrition estimates](docs/screenshots/meal-scan-review.png)

### 2. Save and reuse a meal

Choose **Add to dashboard → Log & save to library** to keep the meal for later, or **Log meal only** to add it to your history. To reuse it, open **Food Library → Saved from photos**, search for the meal or an ingredient, then select it and confirm the portions.

![NutriScan Food Library showing a saved meal with its photo and calorie estimate](docs/screenshots/saved-foods.png)

### 3. Check your history

Go to **Food log → Meal history** to check the original photo on the meal entry. The dashboard shows how the meal contributes to your daily totals.

## Install and run

### Run the web app locally

1. Install Node.js 20 or later. Start MongoDB locally or have a MongoDB connection string ready.
2. From the repository root, install the dependencies.

   ```sh
   npm ci
   npm ci --prefix client
   ```

3. Copy [`.env.example`](.env.example) to `.env`. Set `MONGODB_URI` and a long random `JWT_SECRET`. Set `NODE_ENV=production` and keep `PORT=5000` for the local address below. To enable photo analysis, set `GEMINI_API_KEY` or `OPENAI_API_KEY`. Keep secrets in the backend environment.
4. Build and start the project.

   ```sh
   npm run build
   npm start
   ```

5. Open [the local sign-in page](http://localhost:5000/login). Register or sign in, then go to **Food log**.

### Use the Android app

1. Install the APK from **[PLACEHOLDER — Add APK download URL]**, or build a debug APK from the `android/` folder using JDK 17, Android SDK Platform 34, and the included Gradle wrapper.
2. Connect the app to your NutriScan server. Press Back from the first screen and choose **Change server**, or set its initial server when building with `-PnutriscanServer=<SERVER_URL>`.
3. For a local test on a physical phone, use your computer's Wi-Fi address and port. On the Android Emulator, use `http://10.0.2.2:5000`. Keep the local server running while you test.

### Hosting and sign-in

To deploy, import the repository into Vercel and keep the root directory at the repository root. The checked-in [Vercel configuration](vercel.json) builds the React app and routes API requests to Express. Add a reachable `MONGODB_URI`, a `JWT_SECRET`, and a photo analysis key to the Vercel project environment.

Google sign-in is optional. Configure a Google OAuth **Web application** client and register the exact `/api/auth/google/callback` URL for the server your users open. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` on the backend. Use a reachable HTTPS server for Google sign-in on Android.

## What I built it with

- **React** for the interface and **Android WebView** for the Android app. Both use the same screens and backend.
- **Node.js and Express** for the API and **MongoDB with Mongoose** for accounts, meals, photos, and saved foods.
- **Gemini or OpenAI** for photo analysis, depending on the backend configuration.
- **Gradle** for Android builds and **Vercel** for the web deployment configuration.

## About me

I'm **[PLACEHOLDER — Your name]**, the creator of NutriScan.

[PLACEHOLDER — Add a sentence or two about yourself and what got you interested in building a nutrition app.]
