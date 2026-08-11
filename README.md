# create-devboy-app

Scaffold a **Devboy backend** project (API only). Configuration UI is local via `devboy studio`.

## Usage

```bash
npx create-devboy-app my-api
# or
npx create-devboy-app
```

Accepts a project name as the first CLI argument. Prompts for compute (AWS), auth (Clerk/none), db (Neon / MongoDB Atlas / none), and cron (QStash/none).

## After create

```bash
cd my-api
cp .env.local.example .env.local
npm run studio    # local dashboard
npm start         # local API
npm run deploy    # public AWS URL for your other apps
```

Kept as a **separate package** from `devboy-cli`.
