# SWGC Android App

This Android Studio project wraps the deployed SWGC web app in Android WebView. It uses the existing Vercel frontend and Render/Supabase backend, so there is one shared account and message database.

## Requirements
- Android Studio with JDK 17
- Android SDK Platform 35
- Internet connection

## Build
1. Open the `android-app` folder in Android Studio.
2. Allow Gradle sync to finish.
3. Choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Install the generated debug APK from `app/build/outputs/apk/debug/app-debug.apk`.

## Included
- Persistent WebView cookies and DOM storage for login sessions
- Android file picker for chat uploads
- Download Manager integration for downloaded attachments
- Android back navigation
- HTTPS-only web content and WebView Safe Browsing

The app loads `https://scratch-would-global-chat.vercel.app/`. If the production domain changes, update `HOME_URL` in `app/src/main/java/app/swgc/roomchats/MainActivity.java`.

This is a WebView-based Android app, not a fully native rewrite. Chat behavior and most UI updates come from the deployed web app.
