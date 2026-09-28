# APTIS API

Create the first administrator only once by setting `APTIS_BOOTSTRAP_ADMIN_EMAIL` and `APTIS_BOOTSTRAP_ADMIN_PASSWORD` from `.env.example` in the server process environment. On startup the API stores a BCrypt hash, never the plain password.

The administrator signs in at `/login.html`, then creates learner or teacher accounts through `POST /api/admin/users`. The API is invite-only: there is deliberately no public registration endpoint.

Run locally after PostgreSQL is available:

The checked-in development defaults expect PostgreSQL at
`127.0.0.1:5432`, database `aptis`, username `aptis`, password `aptis`, and
start the API on port `8081` to match the Vite proxy. Once that local role and
database exist, no environment variables are required:

```powershell
cd server
mvn spring-boot:run
```

Use environment variables to override those defaults for production or when
your local PostgreSQL credentials differ. For example in PowerShell:

```powershell
$env:DATABASE_URL='jdbc:postgresql://127.0.0.1:5432/aptis'
$env:DATABASE_USERNAME='aptis'
$env:DATABASE_PASSWORD='replace-with-a-long-password'
$env:APTIS_BOOTSTRAP_ADMIN_EMAIL='teacher@example.com'
$env:APTIS_BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-unique-long-password'
$env:SERVER_PORT='8081'
mvn spring-boot:run
```

Deploy it behind Nginx on the same domain as the static frontend, proxying `/api/` to this app. Set `SESSION_COOKIE_SECURE=true` in production.

After startup, sign in at `/login.html` and open `/admin.html` to create learner or teacher accounts.

Mock attempts are stored in PostgreSQL by Flyway migration `V7__mock_attempts.sql`.
`GET /api/mock-attempts` returns the signed-in user's drafts and completed attempts;
`PUT /api/mock-attempts/{uuid}` saves answers, Writing responses and the practice
result. Each retake has a separate UUID. Updates include the expected version and
user ID to prevent stale-device overwrites and accidental saves after an account
switch. Speaking recordings (up to 15 MB) are stored as PostgreSQL `bytea` through
`PUT /api/mock-attempts/{uuid}/speaking?version=…` and streamed to their owner by GET.
The list endpoint excludes binary audio. All writes use the existing CSRF protection.

The Exam Centre caches text per account in localStorage and pending recordings in
IndexedDB, and retries pending saves when reconnecting or reopening the page.
Guest data is separate; earlier unscoped results require the learner to choose
"Import my earlier results from this device" after signing in. The new migration
is applied automatically when the updated backend starts; no manual schema reset
is needed. Run `mvn test` for persistence, account-isolation and recording tests.
