# Backend

The code behind the registration API. It checks each sign-up, saves it to MongoDB, and emails the team leader a paddock pass.

| File | What it does |
| --- | --- |
| `handlers.js` | Handles the API requests |
| `teamRegistration.js` | Checks the form data and creates the team |
| `models.js` | Defines what's stored in the database |
| `email.js` | Sends the confirmation emails |
| `pass/` | Makes the paddock pass image |
| `admin.js` | Handles the dashboard's login and data |
| `db.js` | Connects to MongoDB |
| `server.js` | Runs the API on your machine |

The form rules, like what counts as a valid phone or roll number, are in `../shared/teamRules.js`. The website uses the same file.

On Vercel, the files in the root `api/` folder call these same handlers, so local and live behave the same way.

## Run it locally

You'll need MongoDB running on your machine, or a free Atlas database. Then start the API:

```bash
npm ci
cp .env.example .env
npm run dev
```

It runs on http://localhost:4001. Settings go in the `.env` file, which never gets committed. The example points at a local MongoDB and sends no emails. On Vercel, the same settings go in the project's environment variables.

The [root README](../../README.md#deploy-it) lists the other settings, including the ones for sending emails.

## Run the tests

The tests start their own temporary MongoDB, downloading it the first time, so they never touch real data or send real emails.

```bash
npm test
```

GitHub runs these, plus a website build, on every push to `main` and on every pull request.

## API

### `POST /api/register`

```json
{
  "teamName": "Team Alpha",
  "members": [
    { "name": "Alex Morgan", "phone": "9876543210", "rollNumber": "26N000" },
    { "name": "Sam Lee", "phone": "9876543211", "rollNumber": "26Z001" }
  ]
}
```

- A team has 2–3 members, and the first one is the team leader.
- Roll numbers look like `26N000` or `26Z000`, and each one can only be registered once. Batch 23 and older can't register.
- Each member's email is worked out from their roll number, like `26n000@psgtech.ac.in`, and only the team leader gets the confirmation email.
- Phone numbers are 10-digit Indian numbers. Spaces and a `+91` at the start are fine.
- Team names don't have to be unique. Every team gets its own team code, like `GT-7KQ2MX`.

If it works, you get back:

```json
{
  "teamId": "...",
  "teamCode": "GT-7KQ2MX",
  "teamName": "Team Alpha",
  "whatsappUrl": "...",
  "emailQueued": true
}
```

| Status | Meaning |
| --- | --- |
| `201` | Team registered |
| `400` | Something in the form isn't valid |
| `403` | Registration is closed |
| `409` | A roll number is already registered |
| `500` | Something went wrong on the server |

Errors come back as `{ "error": "A message you can show the user" }`.

`emailQueued` means the email is on its way, not that it has arrived. The API replies first and sends it in the background. A failed email is tried twice more, after 30 seconds and then 2 minutes. If those fail too, the team's `emailStatus` becomes `failed`.

### `GET /api/register`

Wakes the API and returns `{ "status": "ready" }`, without saving anything. The form calls it when it opens, and so does the keep-alive job.

### `GET /api/status`

Tells the website whether registration is open: `{ "registrationOpen": true }`.

### `GET /api/health`

Tells you whether the API can reach the database.

### Admin dashboard

The page is at `/admin/dashboard`. Logging in with `ADMIN_PASSWORD` sets a cookie that lasts 30 days, and using the dashboard renews it. Changing the password logs everyone out.

- `POST /api/admin/login` takes `{ "password": "..." }`.
- `GET /api/admin/teams` returns every team, newest first.
- `POST /api/admin/logout` ends the session.

Years come from roll numbers, in `getStudentYear` in `../shared/teamRules.js`. Anything that doesn't fit is listed under "Check these".

## The paddock pass

Each team's pass is made when its email goes out, and it isn't stored. If a pass can't be made, the leader gets a plain email with the team's details instead.

- To change the event date, edit `EVENT_DATE` in `../shared/teamRules.js`. The website's countdown, the pass and the email all use it.
- To change the layout, edit `pass/renderPass.js`.
- To change the email wording, edit `email.js`.
- To change the header, labels, or the website's logo, edit `pass/renderArt.js` and run `npm run pass-art`. That needs the F1 font installed, and you can point `F1_FONT_DIR` to it. The font itself stays out of the repo, and the results are saved as shapes in `pass/art/`.

The pass can show Latin and Tamil text. Anything else in a name, like emoji, is left off the pass.

The GitHub mark is used with permission through the club's GitHub program, so please keep it unmodified.

## What gets saved

- **Teams:** team name, team code, whether the leader's email went out (`emailStatus` is `pending`, `sent`, or `failed`), and its members. Each member has a name, phone, roll number, email, and whether they're the leader.
