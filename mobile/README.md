# SmartSports Mobile

Flutter mobile client for customer bookings, schedules, support requests, and AI facility requests.

## Run locally

Start PostgreSQL and the ASP.NET Core API first. From the repository root:

```powershell
cd backend\SmartSports.Api
$env:SMARTSPORTS_DB_CONNECTION="Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=YOUR_POSTGRES_PASSWORD"
$env:JWT_KEY="replace-this-with-a-long-local-development-key"
dotnet run
```

Then open another terminal:

```powershell
cd mobile
flutter pub get
flutter run
```

## API URL by device

- Flutter Windows/web or a physical Android device using `adb reverse`: `http://localhost:5187`
- Android Emulator: `http://10.0.2.2:5187`
- Release builds must use an HTTPS API URL supplied at build time:

```powershell
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.example.com
```

For a USB-connected Android device, run:

```powershell
adb reverse tcp:5187 tcp:5187
```

The app's **Backend API URL** setting can be used to switch between these values.

## Test and build

```powershell
flutter analyze
flutter test
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.example.com
```

The release APK is generated at `build\app\outputs\flutter-apk\app-release.apk`.

Android release signing is configured through these CI environment variables:
`MYSPOT_KEYSTORE_FILE`, `MYSPOT_KEYSTORE_PASSWORD`, `MYSPOT_KEY_ALIAS`, and
`MYSPOT_KEY_PASSWORD`. Without them, the local release build is unsigned and
must not be uploaded to Google Play.

iOS platform files are under `ios/`. Final iOS builds and signing require
macOS/Xcode and Apple distribution credentials:

```bash
flutter build ios --release --no-codesign --dart-define=API_BASE_URL=https://api.example.com
flutter build ipa --release --dart-define=API_BASE_URL=https://api.example.com
```

For complete project setup instructions, see the repository [README](../../README.md).
# mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
