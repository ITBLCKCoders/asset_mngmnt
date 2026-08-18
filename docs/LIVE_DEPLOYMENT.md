# LIVE Environment Setup (Port 9999)

This guide creates a **full copy** of the `asset_mngmnt` database into a new
`asset_mngmnt_prod` database and runs the app as the **LIVE** environment on
port **9999**. It covers both the machine that has the dev database and another
computer whose code comes from GitHub.

## How it works

- `db/init_prod_db.ps1` is the one-stop script. It:
  - reads MySQL credentials from an env file (default `server/.env`),
  - creates `asset_mngmnt_prod` if it doesn't exist,
  - dumps **schema + data + stored procedures + triggers + events** from
    `asset_mngmnt` and restores it into `asset_mngmnt_prod`.
- Four modes:
  | Mode | Command | What it does |
  | --- | --- | --- |
  | Full copy | `.\db\init_prod_db.ps1` | Copy `asset_mngmnt` → `asset_mngmnt_prod` on this machine (structure + ALL data) |
  | Schema sync | `.\db\init_prod_db.ps1 -SchemaOnly` | Push schema + SP/trigger changes + reference data (users, roles, permissions, custodians, addresses) while keeping existing live data |
  | Export | `.\db\init_prod_db.ps1 -DumpOnly dump.sql` | Write a portable `.sql` file (to move to another PC) |
  | Import | `.\db\init_prod_db.ps1 -ImportFile dump.sql` | Import a `.sql` file into `asset_mngmnt_prod` (no source DB needed) |
- The LIVE server runs from `server/.env.live` (`HTTP_PORT=9999`) and the LIVE
  client dev server from `client/.env.live` (`VITE_DEV_PORT=9998`).

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| API (server) | 9999 | Express + Socket.IO (`server/.env.live`) |
| Client (dev server) | 9998 | Vite dev server (`client/.env.live`) |
| MySQL | 3306 | MySQL 8 (unchanged) |

## Prerequisites (both machines)

1. **Node.js 24.x** — check with `node --version` (see `.tool-versions`).
2. **MySQL 8.0+** installed and running — check with:
   ```powershell
   mysql -u root -p -e "SELECT VERSION();"
   ```
3. **mysql / mysqldump on PATH** or installed in a standard MySQL bin folder
   (the script auto-detects these paths):
   - `C:\Program Files\MySQL\MySQL Server 8.0\bin`
   - `C:\Program Files\MySQL\MySQL Server 8.4\bin`
   - `C:\Program Files\MySQL\MySQL Server 9.0\bin`
4. **Git** (only needed on the second machine).

> If PowerShell blocks the script with an execution-policy error, run it with:
> `powershell -ExecutionPolicy Bypass -File .\db\init_prod_db.ps1`

## Important: env files are gitignored

`server/.env.live` and `client/.env.live` are **not in git**
(`server/.env.*` and `client/.env.*` are in `.gitignore`). They must exist on
every machine that runs the LIVE environment. The database itself is also not
in git — it is moved between machines as a dump file.

---

## 1. Main machine (has the `asset_mngmnt` dev database)

### 1.1 Create the database copy

From the repo root, run:

```powershell
.\db\init_prod_db.ps1
```

You should see `LIVE database 'asset_mngmnt_prod' is ready.`

This is a **full copy**: it includes all tables and their data — including the
reference tables `users`, `asset_mngmnt_roles`, `role_permissions`,
`user_permissions`, `custodians`, `user_custodian_settings`, `user_address` —
plus stored procedures, triggers and events.

**Verify the copy** — tables and a row count check:

```powershell
mysql -u root -p -e "USE asset_mngmnt_prod; SHOW TABLES; SELECT COUNT(*) AS users FROM users;"
```

Optional parameters (all have defaults, so you normally don't need them):

```powershell
# Point at a different source env / database / target name
.\db\init_prod_db.ps1 -SourceEnv server\.env -SourceDb asset_mngmnt -TargetDb asset_mngmnt_prod
```

### 1.2 Create the env files

If this is the original machine, `server/.env.live` and `client/.env.live`
already exist in the repo folder (gitignored). Confirm with:

```powershell
Test-Path server\.env.live   # -> True
Test-Path client\.env.live   # -> True
```

If they are missing, recreate them from the templates in section 2.4
(copy the secret values from `server/.env` / `server/.env.uat`).

### 1.3 Install dependencies (first time only)

```powershell
npm install
```

### 1.4 Run — development

```powershell
npm run dev:live
```

This starts both the API (port 9999) and the Vite client (port 9998).

- API: `http://localhost:9999`
- Client: `http://localhost:9998`

### 1.5 Run — production-style (optional)

```powershell
npm run build
npm run start:live
```

> `start:live` runs only the server on 9999. Serve the built `client/dist`
> folder through your web server (IIS / nginx / etc.) and point it at the API.

### 1.6 Verify it is up

```powershell
curl http://localhost:9999/health   # -> {"status":"OK",...}
```

Then open `http://localhost:9998` in a browser and log in.

---

## 2. Another computer (code comes from GitHub)

### 2.1 Get the code

```powershell
git clone <repo-url>
cd asset_mngmnt
npm install
```

### 2.2 Transfer the database dump

On the **original machine** (section 1), export a portable dump:

```powershell
.\db\init_prod_db.ps1 -DumpOnly asset_mngmnt_prod_dump.sql
```

You should see `Dump exported to: asset_mngmnt_prod_dump.sql`.

Copy that file to the other computer (USB / network share / `scp`).

### 2.3 Import the dump

On the new computer, from the repo root:

```powershell
.\db\init_prod_db.ps1 -ImportFile asset_mngmnt_prod_dump.sql
```

This creates `asset_mngmnt_prod` (if missing) and imports everything. It does
**not** need the source `asset_mngmnt` database to exist.

**Verify**:

```powershell
mysql -u root -p -e "USE asset_mngmnt_prod; SHOW TABLES;"
```

### 2.4 Create the env files

> Quickest option: copy `server/.env.live` and `client/.env.live` straight from
> the original machine and skip to section 2.5. If you recreate them manually,
> use the templates below.

**`server/.env.live`** — the values marked `(same as original)` must match the
original environment or users won't be able to log in:

```dotenv
HTTP_PORT=9999

JWT_SECRET=<same as original - 64+ chars>
COOKIE_SECRET=<same as original - 32+ chars>
ACCESS_TOKEN_EXPIRES=900
REFRESH_TOKEN_EXPIRES=7d

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=<your mysql password>
MYSQL_DB=asset_mngmnt_prod

# localhost for local-only; set to this machine's LAN IP for network access
COOKIE_DOMAIN=localhost

# Replace <LAN-IP> with this machine's IP (find it with: ipconfig)
ALLOWED_ORIGINS=http://localhost:9999,http://localhost:9998,http://<LAN-IP>:9999,http://<LAN-IP>:9998

API_PUBLIC_URL=http://localhost:9999
FRONTEND_URL=http://localhost:9998

# Also copy from the original machine:
# RESEND_API_KEY, RESEND_FROM_EMAIL,
# CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
# TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID,
# VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_APPLICATION_ID, VONAGE_FROM_NUMBER
```

**`client/.env.live`**:

```dotenv
VITE_API_URL=http://localhost:9999
VITE_API_BASE=http://localhost:9999/api
VITE_SOCKET_URL=http://localhost:9999
VITE_API_PROXY_TARGET=http://localhost:9999
VITE_DEV_PORT=9998
VITE_IDLE_TIMEOUT_MS=300000000
VITE_WARNING_TIME_MS=15000
VITE_ENABLE_IDLE_SOUND=true
VITE_IDLE_SOUND_PATH=/sounds/notification.mp3
```

### 2.5 Run

Same as sections 1.4–1.6:

```powershell
npm run dev:live          # development
```

or

```powershell
npm run build
npm run start:live        # production-style (server only on 9999)
```

Verify with `curl http://localhost:9999/health` and by opening `http://localhost:9998`.

---

## 3. Updating the LIVE database later

### 3.1 Push schema + SP + reference data updates (keep live data)

When you change tables/stored procedures in the local `asset_mngmnt` database
and want those changes in the LIVE DB **without** overwriting LIVE data, run the
schema-sync mode:

```powershell
.\db\init_prod_db.ps1 -SchemaOnly
```

What it does:

- **New tables** are created (`CREATE TABLE IF NOT EXISTS`).
- **Stored procedures, functions and triggers** are replaced with the local
  versions.
- **Existing tables and their LIVE data are left untouched.**
- Reference data is refreshed (`INSERT IGNORE`) for:
  `users`, `asset_mngmnt_roles`, `role_permissions`, `user_permissions`,
  `custodians`, `user_custodian_settings`, `user_address`
  (new/added rows from the local DB appear in LIVE; existing rows are kept).

> **Important:** `-SchemaOnly` does **not** alter columns of **existing** tables
> (a `CREATE TABLE IF NOT EXISTS` skips tables that already exist). For column
> changes — e.g. a migration that adds a column to an existing table — run that
> migration's SQL manually against LIVE:

```powershell
mysql -u root -p asset_mngmnt_prod < db\migration_add_xxx.sql
```

### 3.2 Full refresh (replaces ALL live data with local data)

Re-running the script refreshes the LIVE DB from the current dev DB
(re-import drops and recreates tables, so it overwrites the previous copy —
including all live data):

```powershell
.\db\init_prod_db.ps1
```

To push that updated data to another machine, re-export and re-import:

```powershell
# original machine
.\db\init_prod_db.ps1 -DumpOnly asset_mngmnt_prod_dump.sql

# other machine
.\db\init_prod_db.ps1 -ImportFile asset_mngmnt_prod_dump.sql
```

To update the **code** on the other machine later:

```powershell
git pull
npm install        # if dependencies changed
npm run build      # if you run the production build
```

---

## 4. Troubleshooting

| Symptom | Fix |
| --- | --- |
| PowerShell won't run the script (execution policy) | Run `powershell -ExecutionPolicy Bypass -File .\db\init_prod_db.ps1` |
| `MySQL tools not found` | Add the MySQL `bin` folder to PATH, or install MySQL Server |
| `Access denied` on DB commands | Check `MYSQL_USER` / `MYSQL_PASSWORD` in the env file you pass |
| Restore fails with GTID errors | The script already uses `--set-gtid-purged=OFF`; if you made the dump yourself, add that flag |
| CORS / cookie errors over the network | Set `ALLOWED_ORIGINS` and `COOKIE_DOMAIN` in `server/.env.live` to this machine's LAN IP, restart the API |
| Port 9999 already in use | `netstat -ano | findstr :9999` to find the process, or change `HTTP_PORT` in `server/.env.live` |
| Client can't reach the API | Confirm `VITE_API_PROXY_TARGET` / `VITE_API_BASE` in `client/.env.live` point at port 9999 |
| Login/session not working after transfer | Confirm `JWT_SECRET` and `COOKIE_SECRET` in `server/.env.live` match the original machine |
| Charset / foreign-key errors on import | Target DB is created as `utf8mb4` / `utf8mb4_unicode_ci`; re-create it if it was created with another charset |
| `-SchemaOnly` fails on a SP/trigger referencing a new column | A column was added to an existing table; run that migration manually: `mysql -u root -p asset_mngmnt_prod < db\migration_add_xxx.sql`, then re-run `-SchemaOnly` |
| Reference users/roles not updated in LIVE | `-SchemaOnly` uses `INSERT IGNORE` (existing rows are kept). To force overwrite, run a full copy (`.\db\init_prod_db.ps1`) instead |

---

## 5. Script reference (`db/init_prod_db.ps1`)

```powershell
# Full copy: asset_mngmnt -> asset_mngmnt_prod (defaults)
.\db\init_prod_db.ps1

# Push schema + SP/trigger changes + reference data, keep existing LIVE data
.\db\init_prod_db.ps1 -SchemaOnly

# Custom source env / DB / target
.\db\init_prod_db.ps1 -SourceEnv server\.env -SourceDb asset_mngmnt -TargetDb asset_mngmnt_prod

# Export a portable dump (for another machine)
.\db\init_prod_db.ps1 -DumpOnly asset_mngmnt_prod_dump.sql

# Import a dump (no source DB needed)
.\db\init_prod_db.ps1 -ImportFile asset_mngmnt_prod_dump.sql
```