# GiTogether 2026 Registration

This is the registration site for GiTogether 2026. Teams of 2–3 sign up and get a link to join the event's WhatsApp group. Everyone signs up with their roll number, which gives us their college email, and the team leader gets the team's paddock pass there.

This repo only covers registration. Nothing else for the event lives here.

| Page | Live URL |
| --- | --- |
| Registration | https://ghcc.psgtech.ac.in/gitogether2026/registration |
| Admin dashboard | https://ghcc.psgtech.ac.in/gitogether2026/admin |

## How it works

The React site sends the form to a small API, and the API saves the team in MongoDB. Both run from one Docker image, so they share one URL.

```text
registration/
├── frontend/           # The website
├── backend/            # Registration logic, database code, and emails
└── shared/             # Form rules and the base path, used by both the website and the API
```

More detail is in the [frontend](registration/frontend/README.md) and [backend](registration/backend/README.md) READMEs.

## Run it locally

You'll need Node.js 22 and a MongoDB database.

```bash
# Terminal 1: the API
cd registration/backend
npm ci
cp .env.example .env
npm run dev

# Terminal 2: the website
cd registration/frontend
npm ci
npm run dev
```

Then open http://localhost:5173/gitogether2026/registration.

## Deploy it

The `build-and-push` job in [ci.yml](.github/workflows/ci.yml) deploys the site. It builds the Docker image, pushes it to GHCR as `ghcr.io/github-campus-club-psgct/gitogether2026regis:latest`, and asks Jenkins to deploy it. It runs on every push to `main` and on every pull request.

The site's nginx has to send `/gitogether2026` to the app, with something like this in the `server` block that handles HTTPS. Don't change this prefix: the app and nginx have to match, and any other prefix takes the site down.

```nginx
# No path after the port: the app expects to receive the /gitogether2026 prefix.
location /gitogether2026 {
    proxy_pass http://127.0.0.1:4001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    # Without this, the admin login cookie isn't marked secure.
    proxy_set_header X-Forwarded-Proto $scheme;

    # The app doesn't compress anything itself.
    gzip on;
    gzip_proxied any;
    gzip_types text/css application/javascript image/svg+xml;
}
```

If nginx runs in its own container, `127.0.0.1` won't reach the app. Put both on the same Docker network and use `http://app:4001` instead.

To check that everything's connected, visit `/gitogether2026/api/health` on your site. It should say `connected`.

If you're using MongoDB Atlas, add the server's IP address to its network access settings. The server also has to be allowed to make outgoing connections to `SMTP_HOST` on `SMTP_PORT`, or emails will fail.

To run the image by hand instead, copy `registration/backend/.env.example` to `registration/backend/.env`, fill it in, and run `docker compose up -d --build`. To use a different port, set `APP_PORT`. With `compose.yaml`, emails still being sent get up to 4 minutes to finish before the app stops.

The app uses these settings:

| Variable | Needed? | What it's for |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Your MongoDB connection string |
| `REGISTRATION_OPEN` | No | Set to `false` to close registration. It's open by default. |
| `ADMIN_PASSWORD` | For the dashboard | The password for `/gitogether2026/admin`. Use something long, since nothing limits how many guesses someone can make. |
| `SEND_EMAILS` | For emails | Set to `true` to send emails. Without it, registration still works but no emails go out. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | For emails | Your email login. For a Google account, use `smtp.gmail.com`, the email address, and an app password. |
| `SMTP_PORT` | No | Defaults to `587` |
| `EMAIL_FROM` | No | The sender address. Defaults to `SMTP_USER`. |

The app only reads these when it starts, so restart it after changing them, like when opening or closing registration.
