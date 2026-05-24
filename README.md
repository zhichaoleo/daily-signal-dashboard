# Daily Signal Dashboard

Mobile-first personal dashboard for Shanghai weather, daily horoscopes, and watched US stocks.

## Local Development

```bash
npm install
cp .env.example .env
npx netlify dev
```

Set the API keys in `.env`:

- `FINNHUB_API_KEY`
- `ALPHA_VANTAGE_API_KEY`

The app calls `/api/dashboard`, served by `netlify/functions/dashboard.mts`.

## Deploy

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
