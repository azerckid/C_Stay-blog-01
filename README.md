# STAYnC Blog

A modern Twitter/X clone built with React Router v7, Drizzle ORM, and Turso (libSQL). Features a beautiful UI with Tailwind CSS v4 and shadcn/ui components, optimized for mobile-first experiences with Capacitor support.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering with React Router v7
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎨 Tailwind CSS v4 with shadcn/ui (Nova Preset)
- 🗄️ **Drizzle ORM** for type-safe database operations
- 🗃️ **Turso (libSQL)** for edge-ready database
- 🔐 Better Auth for authentication
- 📱 Mobile-first design with Capacitor support
- 🌍 AI-powered travel log features
- 💬 Real-time messaging with Pusher

## Tech Stack

- **Framework**: React Router v7 (Vite)
- **Styling**: Tailwind CSS v4, shadcn/ui (Nova Preset)
- **Database**: Turso (libSQL) with **Drizzle ORM**
- **Authentication**: Better Auth (session-based authentication with Drizzle adapter)
- **Validation**: Zod (schema validation)
- **Date/Time**: Luxon (date and time handling)
- **Media Storage**: Cloudinary (for image and video uploads)
- **Mobile**: Capacitor (iOS, Android native apps, PWA support)
- **Real-time**: Pusher (for messaging and notifications)
- **AI**: Google Gemini API (for embeddings and travel log generation)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Turso account (for database)

### Installation

Install the dependencies:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database (Turso)
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:5173"

# OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URL="http://localhost:5173/auth/google/callback"

KAKAO_CLIENT_ID="your-kakao-client-id"
KAKAO_CLIENT_SECRET="your-kakao-client-secret"
KAKAO_REDIRECT_URL="http://localhost:5173/auth/kakao/callback"

# Pusher (Real-time)
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="ap3"

# Cloudinary (Media)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Google Gemini (AI)
GEMINI_API_KEY="your-gemini-api-key"

# Google Maps
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### Database Setup

The project uses **Drizzle ORM** with Turso (libSQL). The schema is defined in `app/db/schema.ts`.

#### Generate Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations (development)
npx drizzle-kit push

# Or apply migrations from files
npx drizzle-kit migrate
```

#### Verify Schema

```bash
# Check schema syntax
npx drizzle-kit check
```

For more details, see [Database Schema Documentation](./docs/02_DATABASE_SCHEMA.md).

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

The build output will be in the `build/` directory:

```
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Database Operations with Drizzle

### Basic Queries

```typescript
import { db } from "~/db";
import { users, tweets } from "~/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// Find user
const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
});

// Find tweets with relations
const tweet = await db.query.tweets.findFirst({
    where: eq(tweets.id, tweetId),
    with: {
        user: true,
        media: true,
        likes: true,
    },
});

// Insert
const newTweet = await db.insert(tweets).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    content: "Hello, World!",
    updatedAt: new Date().toISOString(),
}).returning();

// Update
const updatedUser = await db.update(users)
    .set({ name: "New Name" })
    .where(eq(users.id, userId))
    .returning();

// Delete
await db.delete(tweets)
    .where(eq(tweets.id, tweetId));

// Transaction
await db.transaction(async (tx) => {
    await tx.insert(tweets).values({ /* ... */ });
    await tx.insert(media).values({ /* ... */ });
});
```

For more examples, see the [Database Schema Documentation](./docs/02_DATABASE_SCHEMA.md).

## Deployment

### Vercel Deployment

The project is configured for Vercel deployment:

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker Deployment

To build and run using Docker:

```bash
docker build -t staync-blog .

# Run the container
docker run -p 3000:3000 staync-blog
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build` and set all required environment variables.

## Project Structure

```
├── app/
│   ├── components/     # React components
│   ├── db/             # Drizzle schema and database client
│   │   ├── schema.ts   # Database schema definitions
│   │   └── index.ts    # Database client initialization
│   ├── lib/            # Utility functions and server-side code
│   ├── routes/         # React Router routes
│   └── types/          # TypeScript type definitions
├── docs/               # Project documentation
├── drizzle.config.ts   # Drizzle Kit configuration
└── package.json        # Dependencies and scripts
```

## Documentation

- [Database Schema](./docs/02_DATABASE_SCHEMA.md) - Database structure and Drizzle ORM usage
- [Implementation Plan](./docs/01_IMPLEMENTATION_PLAN.md) - Project roadmap
- [UI Design System](./docs/03_UI_DESIGN_SYSTEM.md) - Design tokens and guidelines
- [Database Migration](./DATABASE_MIGRATION.md) - Migration from Prisma to Drizzle

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Type check TypeScript
- `npx drizzle-kit generate` - Generate migration files
- `npx drizzle-kit push` - Apply migrations (development)
- `npx drizzle-kit check` - Verify schema syntax

## Styling

This project uses [Tailwind CSS v4](https://tailwindcss.com/) with the [shadcn/ui](https://ui.shadcn.com/) component library (Nova Preset) for a modern, accessible UI.

## License

MIT

---

Built with ❤️ using React Router v7 and Drizzle ORM.
