# Asset Management System

A comprehensive asset management system built with React, TypeScript, Node.js, and MySQL.

## Project Structure

```
asset_mngmnt/
├── client/                          # Frontend application (React + TypeScript + Vite)
│   ├── public/                     # Static assets
│   │   ├── sounds/                 # Audio files
│   │   └── images/                 # Image assets
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── ui/                # Pre-built UI components (shadcn/ui)
│   │   │   ├── common/            # Common components (sidebar, notification bell, etc.)
│   │   │   └── routes/            # Route protection components
│   │   ├── pages/                  # Page components
│   │   │   ├── auth/              # Authentication pages (login, register, etc.)
│   │   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── assets/            # Asset management pages
│   │   │   ├── settings/          # Settings pages
│   │   │   ├── profile/           # User profile pages
│   │   │   └── history/           # Audit and history pages
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── context/                # React context providers
│   │   ├── lib/                    # Utility libraries
│   │   │   ├── api/               # API integration
│   │   │   ├── auth/              # Authentication utilities
│   │   │   └── utils/             # General utilities
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── utils/                  # Utility functions
│   │   ├── styles/                 # Global styles
│   │   ├── App.tsx                 # Main application component
│   │   └── main.tsx                # Application entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/                          # Backend application (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── controllers/            # Request handlers
│   │   ├── routes/                 # API routes
│   │   ├── middleware/             # Express middleware
│   │   ├── services/               # Business logic services
│   │   ├── models/                 # Database models
│   │   ├── types/                  # TypeScript type definitions
│   │   ├── utils/                  # Utility functions
│   │   ├── config/                 # Configuration files
│   │   ├── db/                     # Database connection and initialization
│   │   ├── sockets/                # Socket.io handlers
│   │   ├── auth/                   # Authentication module
│   │   ├── logger/                 # Logging configuration
│   │   └── index.ts                # Server entry point
│   ├── certs/                      # SSL certificates
│   ├── package.json
│   └── tsconfig.json
├── db/                              # Database schema and migrations
│   ├── migrations/                 # Database migration files
│   ├── backups/                    # Database backup files
│   └── schemas/                    # Database schema definitions
├── plans/                           # Project plans and documentation
├── scripts/                         # Utility scripts (debug, migration, etc.)
├── .env.example                     # Example environment variables
├── package.json                     # Root package.json with workspaces
└── README.md                        # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` and fill in the required values
   - Copy `client/.env.example` to `client/.env`
   - Copy `server/.env.example` to `server/.env`

4. **Set up the database**:
   - Create a MySQL database
   - Run the migration scripts in `db/migrations/`
   - Or restore from a backup in `db/backups/`

### Running the Application

#### Development Mode

```bash
npm run dev
```

This will start both the client and server in development mode.

#### Production Mode

```bash
npm run build
npm start
```

### Testing

Unit tests use Jest. Run them from the **project root**:

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests (server then client) |
| `npm run test:server` | Run server unit tests only |
| `npm run test:client` | Run client tests only |

```bash
# From project root (asset_mngmnt/)
npm run test
```

To run tests from a workspace directory: `cd server` then `npm run test:unit`, or `cd client` then `npm test`.

### Project Configuration

#### Client
- **Port**: 9669 (HTTP) or 443 (HTTPS)
- **Host**: `assetmanagement.sys`
- **Vite configuration**: `vite.config.ts`

#### Server
- **Port**: 6996 (HTTP)
- **Database**: MySQL connection details in `server/.env`
- **SSL**: Self-signed certificates in `server/certs/`

### Key Features

- Asset management (create, edit, delete, track)
- Asset issuance and return
- Asset repair and maintenance
- Asset disposal
- User management and authentication
- Role-based access control
- Department and location management
- Audit trail and history
- Notifications and alerts
- Dashboard with analytics

### Technologies Used

#### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Shadcn UI components
- React Router
- React Query

#### Backend
- Node.js
- Express
- TypeScript
- MySQL
- Socket.io
- JWT authentication
- Winston logging

### Documentation

- **AI / Codebase Context**: [AGENTS.md](AGENTS.md) — structured documentation for AI assistants and contributors (architecture, patterns, anti-hallucination notes)
- **API Documentation**: Swagger UI available at `/api-docs`
- **Project Plans**: `plans/` directory contains project planning documents
- **Database Schema**: `db/schemas/` contains database structure documentation

### Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

### License

This project is licensed under the MIT License.
