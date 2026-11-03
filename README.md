# GiTogether 2026 Registration

This is the registration site for GiTogether 2026. Teams of 2–3 sign up and get a link to join the event's WhatsApp group. Everyone signs up with their roll number, which gives us their college email, and the team leader gets the team's paddock pass there.

This repo only covers registration. Nothing else for the event lives here.

## How it works

The React site sends the form to a small API, and the API saves the team in MongoDB. Both are hosted together on Vercel, so they share one URL.

```text
api/                    # Vercel API routes
registration/
├── frontend/           # The website
├── backend/            # Registration logic, database code, and emails
└── shared/             # Form rules used by both the website and the API
```

More detail is in the [frontend](registration/frontend/README.md) and [backend](registration/backend/README.md) READMEs.

## Run it locally

You'll need Node.js 20.19 or newer and a MongoDB database.

```bash
# Terminal 1: the API
cd registration/backend
npm ci
npm run dev

# Terminal 2: the website
cd registration/frontend
npm ci
npm run dev
```

Then open http://localhost:5173.

## Deploy it

1. Import this repo into Vercel and leave the settings as they are. `vercel.json` takes care of the build.
2. Add the environment variables below.
3. Deploy.

If you're using MongoDB Atlas, make sure its network access settings let Vercel connect. The API runs in Vercel's Mumbai region to stay close to the database, which you can change in `vercel.json`.

To check that everything's connected, visit `/api/health` on your site. It should say `connected`.

| Variable | Needed? | What it's for |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Your MongoDB connection string |
| `REGISTRATION_OPEN` | No | Set to `false` to close registration. It's open by default. |
| `ADMIN_PASSWORD` | For the dashboard | The password for `/admin/dashboard`. Use something long, since nothing limits how many guesses someone can make. |
| `SEND_EMAILS` | For emails | Set to `true` to send emails. Without it, registration still works but no emails go out. |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | For emails | Your email login. For a Google account, use `smtp.gmail.com`, the email address, and an app password. |
| `SMTP_PORT` | No | Defaults to `587` |
| `EMAIL_FROM` | No | The sender address. Defaults to `SMTP_USER`. |

Vercel only picks up changed variables on the next deploy, so redeploy after opening or closing registration.

### Keep it quick

Vercel's free plan shuts functions down when they're idle. To wake the API every few minutes, add your site's address as a repository variable called `SITE_URL` (Settings → Secrets and variables → Actions → Variables). The `Keep alive` workflow then runs from `main`. GitHub can delay these runs, so the form also wakes the API when it opens.
