# ShreeJiMart (Angular + .NET Web API + PostgreSQL)

## Structure

- `ShreeJiMart.sln` – open in Visual Studio 2022
- `backend/ShreeJiMart.Api` – .NET 9 Web API
- `frontend/shreejimart-web` – Angular app

## Ports

- API: `http://localhost:5080` (Swagger: `/swagger`)
- UI: `http://localhost:4200`

## Database (PostgreSQL)

### Neon (cloud)

1. In [Neon](https://neon.tech), copy the **connection string** (`postgresql://...?sslmode=require`).
2. Create `backend/ShreeJiMart.Api/.env` (gitignored) with:
   ```
   DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
   ```
   Or set `DATABASE_URL` in VS 2022 → **ShreeJiMart.Api** → Properties → Debug → Environment variables.
3. In Neon **SQL Editor**, run `database/neon-full-schema.sql` (creates `categories`, `products`, `orders`, `order_lines`).
4. If the database already exists, also run `database/add-stock-column.sql` for product stock tracking.

The API loads `.env` on startup and uses SSL for Neon automatically.

### Local PostgreSQL (optional)

- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Or use `DATABASE_URL` / `POSTGRES_CONNECTION_STRING` instead.

## Run API (Visual Studio)

1. Open `ShreeJiMart.sln`
2. Set **ShreeJiMart.Api** as startup project
3. Press **F5** → opens `http://localhost:5080/swagger`

## Run Angular

```powershell
cd frontend/shreejimart-web
npm install
npm start
```

Open `http://localhost:4200`.

## Guest checkout (cash on delivery)

1. Customer adds products from the shop and opens **Cart** → **Checkout**.
2. Guest enters mobile number and delivery address (name optional) and places the order (COD).
3. Admin opens **Admin → Orders**, calls the customer to confirm, then updates status: Pending → Confirmed → Out for delivery → Delivered.

API: `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/{id}/status`.

## Deploy (split subdomains)

| App | Subdomain | Build output |
|-----|-----------|--------------|
| Angular UI | `https://test.sanatini.com` | `frontend/shreejimart-web/dist/shreejimart-web/browser` |
| .NET API | `https://apitest.sanatini.com` | `dotnet publish -c Release` → `bin/Release/net9.0/publish` |

### 1. API (`apitest.sanatini.com`)

On the server, set environment variables (or `.env` next to the published API):

```
DATABASE_URL=postgresql://...
CORS_ORIGINS=https://test.sanatini.com
ASPNETCORE_ENVIRONMENT=Production
```

Point the subdomain to the published API (IIS site, nginx reverse proxy, or your host’s .NET app slot). Ensure **HTTPS** is enabled.

Test URLs (after hosting is configured):

- `https://apitest.sanatini.com/` → JSON `{ status: "running" }`
- `https://apitest.sanatini.com/api/categories`
- `https://apitest.sanatini.com/swagger` (set `SWAGGER_ENABLED=true` on server)

**Important:** Upload the **files inside** `publish` (dll, web.config, wwwroot) to the site **root** — not inside an extra `publish` subfolder.

**Windows IIS:** Install [.NET 9 Hosting Bundle](https://dotnet.microsoft.com/download/dotnet/9.0), create an IIS site pointing to the folder, ensure `web.config` is present. Copy `.env` next to `ShreeJiMart.Api.dll`.

**Linux + nginx:** Run `dotnet ShreeJiMart.Api.dll` behind a reverse proxy; do not upload to a plain PHP/static host only.

If you see a browser **404** on `/`, the server is usually **not running** the .NET app (static hosting only). Contact your host to enable **ASP.NET Core** or use a .NET-capable platform (Azure, Railway, VPS with IIS/nginx).

Uploaded images are served from `https://apitest.sanatini.com/uploads/products/...`.

### 2. UI (`test.sanatini.com`)

```powershell
cd frontend/shreejimart-web
npm install
npm run build
```

Upload everything inside `dist/shreejimart-web/browser` to the site root for `test.sanatini.com`.

Production build uses `environment.production.ts` → API URL `https://apitest.sanatini.com`.

`public/web.config` is included for **IIS** so Angular routes (`/cart`, `/admin/login`, etc.) work on refresh.

### 3. DNS

Create **A** or **CNAME** records for both subdomains pointing to your server or hosting provider.

### 4. CORS checklist

If the shop loads but API calls fail in the browser:

- API `CORS_ORIGINS` must include exactly `https://test.sanatini.com` (no trailing slash).
- UI must call `https://apitest.sanatini.com` (set in production environment).
- Both sites should use **HTTPS** in production.
