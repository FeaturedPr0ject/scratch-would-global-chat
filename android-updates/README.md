# SWGC Android Update Manifest

`manifest.json` is read by the Android app's Settings → Android App → Check for Updates action. The Android APK workflow updates this file after publishing each eligible APK, so releases do not need to be queried manually by the app.

Fields:

- `version`: APK version name.
- `version_code`: monotonically increasing Android version code.
- `apk_url`: HTTPS URL to the APK published by the workflow.
- `channel`: release channel.
- `updated_at`: UTC timestamp of the workflow update.

Do not put API keys or signing secrets in this directory.
