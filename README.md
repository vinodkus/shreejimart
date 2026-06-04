# ShreeJiMart (Angular + .NET Web API + PostgreSQL)

## Structure

- `ShreeJiMart.sln` – open in Visual Studio 2022
- `backend/ShreeJiMart.Api` – .NET 9 Web API
- `frontend/shreejimart-web` – Angular app

## Ports

- API: `http://localhost:5080` (Swagger: `/swagger`)
- UI: `http://localhost:4200`

## Database (PostgreSQL)

Set environment variables (do not commit passwords):

- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `POSTGRES_DB=ShreeJiMart`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=<your-password>`

In VS 2022: right-click **ShreeJiMart.Api** → Properties → Debug → Environment variables.

Tables expected: `categories`, `products` (snake_case columns).

**Guest orders (COD):** run `database/orders-schema.sql` in pgAdmin to create `orders` and `order_lines` tables.

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
