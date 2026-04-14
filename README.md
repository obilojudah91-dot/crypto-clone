# crypto-clone

This repo is arranged for static deployment on Vercel from the `site/` folder.

## Deploy to Vercel
1. Push this repo to GitHub.
2. In Vercel, import the repo.
3. No build command. No output directory.

The `vercel.json` routes everything to `site/` so the static site is served.

## Local dev (optional)
If you want to run the local Express server:
```
cd site
npm install
npm run dev
```

Note: The server uses SQLite in `site/data/` and reads `.env.local` or `.env`.