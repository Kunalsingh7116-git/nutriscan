# NutriScan

NutriScan tracks nutrition on the web and Android. Analyze a meal photo, review
its nutrition estimates, and log it. Save meals to your Food Library for reuse,
and track daily totals, trends, and health profiles. Both clients use the same
React interface, Express API, and MongoDB database.

[Open NutriScan](https://nutriscan-six-theta.vercel.app/login).

## Run the website locally

Install Node.js 20 or later and run MongoDB locally, or use a MongoDB Atlas
connection string. From the repository root, run:

```sh
npm ci
npm ci --prefix client
```

Copy [`.env.example`](.env.example) to `.env`. For a local MongoDB server, set
`MONGODB_URI=mongodb://127.0.0.1:27017/NutriScanDB`. Set `JWT_SECRET` to a long
random value and set `NODE_ENV=production` so Express serves the built website.
Leave `PORT=5000` to use the URL below.

```sh
npm run build
npm start
```

Open [http://localhost:5000/login](http://localhost:5000/login). For frontend
development with live reload, set `NODE_ENV=development` and use `npm run dev`.
The React development server runs at [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Import the GitHub repository into Vercel and leave **Root Directory** at the
   repository root. The checked-in `vercel.json` runs the React build and routes
   API requests to a Node.js function on the same domain.
2. In the project's environment settings, add a Vercel-reachable `MONGODB_URI`
   and a long random `JWT_SECRET`. For photo scans, add `GEMINI_API_KEY` or
   `OPENAI_API_KEY`. Keep these values in Vercel's environment settings.
3. Deploy and open the generated HTTPS URL. Register or sign in, then verify
   photo scanning, the Food Library, and Meal History with a small test image.
   If you enable Google sign-in, register the production callback described
   below and redeploy after adding the OAuth credentials.

The Vercel deployment accepts original meal photos up to 4 MB, within
[Vercel's function payload limit](https://vercel.com/docs/functions/limitations).
The standalone server accepts photos up to 10 MB. A photo stored by a standalone
server above the Vercel limit displays a placeholder when viewed through Vercel.

## Google sign-in

Choose **Continue with Google** on either the sign-in or registration screen.
The first successful sign-in creates a NutriScan account. If the email already
belongs to a password account, continue signing in with that password.

1. In Google Cloud, create an OAuth client of type **Web application**. If your
   OAuth app is in testing mode, add the Google accounts that will test it.
2. Add the exact callback URL to the client's **Authorized redirect URIs**.
   For the local website, use `http://localhost:5000/api/auth/google/callback`.
   For Android, use `https://YOUR-HOST/api/auth/google/callback` on your deployed
   NutriScan server.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in
   the backend environment, then restart NutriScan. Keep the client secret in
   the backend environment.
4. Open the website on the same origin as the callback. For Android, connect the
   app to the configured HTTPS server. The app opens the system browser for the
   Google account selection and returns to NutriScan to finish signing in.

The Google button becomes available when the backend credentials are configured
and the client is using the callback's origin. A development server reached over
a private Wi-Fi IP and plain HTTP still supports email and password.

## Build and use Android

Install JDK 17 and Android SDK Platform 34, then run from the repository root:

```powershell
cd android
.\gradlew.bat assembleDebug
```

On macOS or Linux, use `./gradlew assembleDebug` from the same directory. The
debug-signed APK is written to
`android/app/build/outputs/apk/debug/app-debug.apk`.

The Android app connects to `https://nutriscan-w116.onrender.com` by default.
To choose another server, press Back from the first app screen and select
**Change server**. For local testing, connect the phone and development machine
to the same Wi-Fi and enter the computer's private address and port, such as
`http://192.168.1.100:5000`. On the Android Emulator, use
`http://10.0.2.2:5000`. Keep NutriScan running in production mode so the server
can serve the built frontend. You can also set the initial server at build time
with `-PnutriscanServer=https://YOUR-HOST`.

## Meal logging and health profile

- **Photo log** estimates foods, portions, and nutrition from a meal photo.
  Review the estimates or answer a short clarification before saving. **Try an
  example scan** previews the workflow.
- **Manual log** records foods and quantities through the food library.
- **Dashboard** shows daily nutrition, recent meals, alerts, and a seven-day
  calorie trend.
- **Profile** stores height, weight, activity level, allergies, and health
  conditions. The overview calculates BMI from saved measurements.

For live photo scans, set `GEMINI_API_KEY` or `OPENAI_API_KEY` on the backend
and restart the server. If both are set, NutriScan uses Gemini. The optional
`GEMINI_VISION_MODEL` and `OPENAI_VISION_MODEL` settings override the defaults.
The selected provider receives a resized copy for analysis. When you log the
reviewed meal, NutriScan stores the original photo bytes and the confirmed
nutrition estimates. Choose **Log & save to library** to keep a reusable copy
under **Food Library → Saved from photos**, or **Log meal only** to keep the
photo and estimates in Meal History.

### Verify photo logging on web and Android

1. Start MongoDB and the built website as described above, set a vision provider
   key, and sign in on the website and the Android app against that server.
2. In **Food log**, upload or take a photo. Review the results and choose
   **Add to dashboard → Log & save to library**.
3. Open **Food Library → Saved from photos**, search by meal or ingredient, and
   select the entry. Check its photo and estimates, then log it again.
4. Check **Food log → Meal history**. Both entries should show the selected
   meal photo. Repeat with a different photo and **Log meal only**. Its
   thumbnail should appear in history, and the saved food list should stay the same.

JPEG, PNG, WebP, and browser-readable HEIF images are supported.
NutriScan keeps the source bytes in MongoDB, deduplicates identical photos per
account, and serves them only to the signed-in owner. Library entries retain a
snapshot of the reviewed estimates and remain available if the source meal is
removed. Older entries without stored photos show a placeholder.

## Project layout

- [`client/`](client/) contains the shared React interface.
- [`server/`](server/) contains the Express API and Mongoose models.
- [`api/`](api/) adapts the Express API for Vercel.
- [`android/`](android/) contains the Android app and Gradle build.
- [`.env.example`](.env.example) lists backend configuration variables.
