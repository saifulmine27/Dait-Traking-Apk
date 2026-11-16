# Diet Tracker Android

This project wraps the supplied `index.html` in a lightweight Android WebView app.

## Build APK with GitHub Actions
1. Create a new GitHub repository.
2. Upload all files and folders from this project to the repository root.
3. Push to `main` (or `master`) or open Actions → Build Diet Tracker APK → Run workflow.
4. Wait for the workflow to finish.
5. Open the completed workflow run → Artifacts → `Diet-Tracker-debug-apk` and download it.
6. Extract the ZIP; install `app-debug.apk` on your Android phone.

## Notes
- The app uses the supplied HTML unchanged, including its current AI Worker URL and Firebase configuration.
- Diet entries use browser local storage inside the app. Clearing app data/uninstalling may erase local-only data.
- AI and Firebase features need internet access.
- Firebase Google popup sign-in may be restricted in embedded WebViews. If sign-in does not work on Android, implement native Firebase Authentication or a secure browser-based OAuth flow before public release.
- This is a debug APK for testing. A signed release APK should be generated before public Play Store distribution.
