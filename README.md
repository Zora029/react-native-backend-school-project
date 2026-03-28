# Mobile Back

Lightweight Express + PostgreSQL backend for a mobile banking app.

## Features

- TypeScript + Express API
- PostgreSQL data storage
- Automatic `clients` table creation on startup
- Input validation with Zod
- Basic error handling for validation, not found, and server errors

## Requirements

- Node.js 18+
- PostgreSQL

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root with:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=mobile_back
```

## Run the Project

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production:

```bash
npm start
```

Server default URL:

`http://localhost:3000`

## API Endpoints

- `GET /api/clients` - List all clients
- `GET /api/clients/stats` - Get balance stats
- `POST /api/clients` - Create a client
- `PUT /api/clients/:id` - Update a client
- `DELETE /api/clients/:id` - Delete a client

## Project Structure

```text
.
|- index.ts       # API server and routes
|- package.json   # scripts and dependencies
|- tsconfig.json  # TypeScript config
```
