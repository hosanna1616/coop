This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### API documentation (Swagger / OpenAPI)

- **OpenAPI spec:** [openapi.yaml](/openapi.yaml) (or `public/openapi.yaml` in the repo).
- **Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) — interactive docs for backend operations (auth, users, zones, missions, leads, merchants). The app uses Next.js Server Actions; the spec describes the logical API contract.

### Map screen

The home screen shows a zone map (Addis Ababa grid). Set **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`** in `.env` to use **Google Maps**; otherwise the app uses **Leaflet** with OpenStreetMap. The map shows zone polygons by status (Unseen, Scouted, Captured, At risk), a **My location** button, **map type** control (roadmap/satellite), and a **legend**. Tapping a zone opens a drawer with details, Scout, and (for managers) status override.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
