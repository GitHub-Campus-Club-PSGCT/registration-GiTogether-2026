# Frontend

The registration website, built with React, Vite, and Tailwind CSS.

## Run it locally

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Form submissions go to the API on your machine, so start the [backend](../backend/README.md) too.

## Where things are

```text
src/
├── components/
│   ├── auth/      # The registration page and form
│   ├── layout/    # Header, footer, background
│   └── ui/        # Inputs, buttons, and other small pieces
└── lib/           # API calls, form checks, site details
```

## Common changes

| To change | Edit |
| --- | --- |
| Form fields or wording | `src/components/auth/RegisterForm.jsx` |
| Team size, email domain, or phone and roll number rules | `../shared/teamRules.js` |
| Event date, used by the countdown, pass, and email | `EVENT_DATE` in `../shared/teamRules.js` |
| WhatsApp group link | `WHATSAPP_URL` in `backend/email.js` |
| Colors and fonts | `tailwind.config.js` |
| Animations | `src/lib/motion.js` |
| Logo | `npm run pass-art` in `../backend`, which redraws `src/assets/wordmark.svg` |
| Page title and link previews | `index.html` |
