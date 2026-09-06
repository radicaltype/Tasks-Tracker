# Tasks Tracker

A simple Android task tracking application built with Kotlin and Jetpack Compose.

## Building the APK

### Prerequisites
- Android SDK (API 34)
- Java Development Kit (JDK 8 or higher)
- Gradle 8.1+

### Steps to Build

1. **Clone the repository**
   ```bash
   git clone https://github.com/radicaltype/Tasks-Tracker.git
   cd Tasks-Tracker
   ```

2. **Build the APK**
   ```bash
   ./gradlew assembleRelease
   ```
   The APK will be generated at: `app/build/outputs/apk/release/app-release.apk`

3. **Debug APK (for testing)**
   ```bash
   ./gradlew assembleDebug
   ```
   The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

### Using Android Studio

1. Open Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to the `Tasks-Tracker` directory
4. Click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
5. The APK will be generated in `app/build/outputs/apk/`

## Features
- Clean Material Design 3 UI
- Built with Jetpack Compose
- Room database support for local storage
- Kotlin coroutines for async operations

## License
MIT
