# Venue Explorer Platform

A web application for discovering music venues, shows, and artists across Washington, Oregon, Idaho, and British Columbia.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+ with PostGIS extension
- npm or yarn

### Database Setup

1. Install PostgreSQL and PostGIS extension:

   ```bash
   # On macOS with Homebrew
   brew install postgresql postgis
   
   # On Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib postgis
   ```

2. Create the database:

   ```bash
   createdb venue_explorer
   ```

3. Enable PostGIS extension (this will be done automatically by migrations):

   ```sql
   CREATE EXTENSION postgis;
   ```

### Installation

1. Clone the repository and install dependencies:

   ```bash
   cd venue-explorer
   npm install
   ```

2. Copy the environment file and configure your database:

   ```bash
   cp .env.local.example .env.local
   ```

   Update the database connection string in `.env.local`:

   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/venue_explorer
   ```

3. Run database migrations:

   ```bash
   npm run migrate:up
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Migrations

- Create a new migration: `npm run migrate:create <migration-name>`
- Run migrations: `npm run migrate:up`
- Rollback migrations: `npm run migrate:down`
- Check migration status: `npm run migrate`

## Project Structure

```shell
venue-explorer/
├── src/
│   ├── app/          # Next.js app router pages
│   └── lib/          # Utility functions and database config
├── migrations/       # Database migration files
├── public/          # Static assets
└── ...
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Database**: PostgreSQL with PostGIS extension
- **Migrations**: node-pg-migrate
- **Styling**: TailwindCSS
