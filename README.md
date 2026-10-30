# Care4U Frontend

Server-rendered web client for **Care4U**, a hospital and doctor appointment
booking system. It talks to the Care4U backend REST API.

## Stack

- Node.js + Express 5
- EJS templates
- Tailwind CSS 4 (compiled to `public/css/output.css`)
- Vanilla JavaScript for page behaviour (`public/js/<role>/`)
- JWT cookie based session checks in `middleware/`

## Roles and pages

Separate dashboards and pages for **patient**, **doctor**, **staff**, **admin**
and **super admin**, plus shared auth (login, register, OTP, forgot/reset
password) and public home/error pages.

## Project layout

```
server.js, app.js      server entry and Express app
routes/                root router
modules/<role>/        route handlers per role
middleware/            auth guards
utils/api.js           backend API client
views/<role>/          EJS pages and partials
public/                css, js and images
```

## Getting started

```bash
npm install
npm run dev      # nodemon server.js
```

Create a `.env` file (never commit it):

```
PORT=5151
API_BASE_URL=http://localhost:3004/api/v1
ACCESS_JWT_SECRET=
```
