# SmartSports Booking

SmartSports Booking is a full-stack sports facility booking system with an ASP.NET Core API, PostgreSQL database, React web application, Flutter mobile application, and an Agentic AI booking workflow.

## 1. Prerequisites

Install these tools before cloning:

- Git
- .NET SDK 8
- PostgreSQL 14 or newer
- Node.js 22 or newer and npm
- Flutter 3.47.4 or newer
- Android Studio and an Android emulator, if you want to run the mobile app on Android

Verify the installations:

```powershell
git --version
dotnet --version
psql --version
node --version
npm --version
flutter --version
```

## 2. Clone the repository

```powershell
git clone https://github.com/IT24101256/SmartSportsBooking.git
cd SmartSportsBooking
```

## 3. Create the PostgreSQL database

Start PostgreSQL and create a database named `SmartSportsBookingDb`.

Using `psql`:

```powershell
psql -U postgres
```

Then run:

```sql
CREATE DATABASE "SmartSportsBookingDb";
\q
```

The API uses this default local connection:

```text
Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=YOUR_POSTGRES_PASSWORD
```

Do not commit real passwords or production secrets.

## 4. Configure and run the ASP.NET Core API

Open a new terminal at the repository root:

```powershell
cd backend\SmartSports.Api
$env:SMARTSPORTS_DB_CONNECTION="Host=localhost;Port=5432;Database=SmartSportsBookingDb;Username=postgres;Password=YOUR_POSTGRES_PASSWORD"
$env:JWT_KEY="replace-this-with-a-long-local-development-key"
dotnet restore
dotnet ef database update
dotnet run
```

The API normally runs at:

- HTTP: `http://localhost:5187`
- Swagger: `http://localhost:5187/swagger`

Keep this terminal running.

If Entity Framework commands are unavailable, install the tool once:

```powershell
dotnet tool install --global dotnet-ef
```

For later database changes:

```powershell
dotnet ef migrations add YourMigrationName
dotnet ef database update
```

## 5. Run the React web application

Open a second terminal at the repository root:

```powershell
cd web\smart-sports-web
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

The React application calls the API at `http://localhost:5187/api`.

Useful web commands:

```powershell
npm run lint
npm run build
npm run preview
```

## 6. Run the Flutter mobile application

Open a third terminal at the repository root:

```powershell
cd mobile
flutter pub get
flutter analyze
flutter test
flutter run
```

The mobile app starts with the API URL set to `http://localhost:5187`.

For an Android emulator, open the app's server settings and change the API URL to:

```text
http://10.0.2.2:5187
```

For a physical Android device connected through USB, run this from another terminal:

```powershell
adb reverse tcp:5187 tcp:5187
```

Then keep the mobile API URL as:

```text
http://localhost:5187
```

To build a release APK:

```powershell
flutter build apk --release
```

The APK is generated at:

```text
mobile\build\app\outputs\flutter-apk\app-release.apk
```

## 7. Demo accounts

Development seed data creates an administrator account when the API runs in the Development environment. Check the seed code and local database for the current credentials. Change any development credentials before deployment.

You can also register a new Customer account through the React or Flutter application. Email OTP delivery requires these environment variables:

```powershell
$env:SMTP_FROM="your-email@example.com"
$env:SMTP_PASSWORD="your-app-password"
```

Without SMTP configuration, the API logs the development OTP instead of sending email.

## 8. Run all tests

Backend and Agentic AI tests:

```powershell
dotnet test backend\SmartSports.Api.Tests\SmartSports.Api.Tests.csproj --configuration Release
```

React checks:

```powershell
cd web\smart-sports-web
npm run lint
npm run build
```

Flutter checks:

```powershell
cd mobile
flutter analyze
flutter test
```

## 9. Minimum demonstration flow

1. Start PostgreSQL and the API.
2. Open React or Flutter and register or log in.
3. Browse facilities and create a normal booking.
4. Submit an AI facility request.
5. The workflow runs planning, facility analysis, deterministic validation, and action staging.
6. Log in as Manager or Admin in the React application.
7. Open **AI Workflows** and approve, reject, or request a revision with an audit comment.
8. Confirm the resulting booking and workflow history in the API/database.

## 10. GitHub Actions

The workflow in `.github/workflows/ci.yml` runs automatically for pushes and pull requests to `main`. It checks:

- ASP.NET Core restore, tests, and build
- React lint and production build
- Flutter analysis and tests
- Release APK generation and upload

## Project structure

```text
backend/SmartSports.Api       ASP.NET Core API and Agentic AI subsystem
backend/SmartSports.Api.Tests Backend and Agentic AI tests
web/smart-sports-web           React web application
mobile                         Flutter mobile application
docs                           Architecture decision records
.github/workflows              GitHub Actions CI
```
