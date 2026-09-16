# APTIS API

Create the first administrator only once by setting `APTIS_BOOTSTRAP_ADMIN_EMAIL` and `APTIS_BOOTSTRAP_ADMIN_PASSWORD` from `.env.example` in the server process environment. On startup the API stores a BCrypt hash, never the plain password.

The administrator signs in at `/login.html`, then creates learner or teacher accounts through `POST /api/admin/users`. The API is invite-only: there is deliberately no public registration endpoint.

Run locally after PostgreSQL is available:

```sh
export DATABASE_URL='jdbc:postgresql://127.0.0.1:5432/aptis'
export DATABASE_USERNAME='aptis'
export DATABASE_PASSWORD='replace-with-a-long-password'
export APTIS_BOOTSTRAP_ADMIN_EMAIL='teacher@example.com'
export APTIS_BOOTSTRAP_ADMIN_PASSWORD='replace-with-a-unique-long-password'
mvn spring-boot:run
```

Deploy it behind Nginx on the same domain as the static frontend, proxying `/api/` to this app. Set `SESSION_COOKIE_SECURE=true` in production.

After startup, sign in at `/login.html` and open `/admin.html` to create learner or teacher accounts.
