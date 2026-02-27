# PV Dispute Resolution — Frontend

React + TypeScript frontend for the PaisaVasool Dispute Resolution platform.

## Tech Stack

| Concern | Library |
|---|---|
| UI Framework | React 18 + TypeScript |
| State Management | Redux Toolkit |
| Context API | Auth session bootstrapping, Theme (extensible) |
| HTTP Client | Axios (with interceptors) |
| Routing | React Router v6 |
| Forms | React Hook Form |
| Styling | Tailwind CSS |
| Notifications | react-hot-toast |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server (proxies /auth → localhost:8000)
npm run dev
```

## Project Structure

```
src/
├── app/              # Store, root reducer, middleware, routes
├── config/           # env.ts (type-safe env vars), constants.ts
├── components/
│   ├── ui/           # Button, Input, Badge (atomic)
│   └── common/       # PageHeader, LoadingSpinner, EmptyState
├── features/
│   ├── auth/         # Login, Signup, AuthProvider, authSlice, authService
│   ├── disputes/     # Dashboard, ticket mock data (real API coming soon)
│   └── documents/    # Upload + extracted data split view
├── hooks/            # useAppDispatch, useAppSelector, useAuth, useUser
├── layouts/          # AuthLayout (split panel), DashboardLayout (sidebar)
├── lib/              # axios.ts — instance + request/response interceptors
├── services/         # Base API types
├── styles/           # globals.css — Tailwind + custom component classes
├── types/            # Global TS interfaces (User, Ticket, UploadedDocument…)
└── utils/            # formatDate, formatCurrency, formatFileSize
```

## Auth Flow

Tokens are stored exclusively in **HttpOnly cookies** managed by the server.
The frontend never reads or stores tokens — Axios sends `withCredentials: true`
on every request so cookies are attached automatically.

### Token Refresh
The Axios response interceptor catches **401** errors and automatically calls
`POST /auth/refresh`. Concurrent requests are queued and replayed after a
successful refresh. On refresh failure, Redux state is cleared and the user is
redirected to login.

## Adding the Dispute Service

When `dispute-service` endpoints are available:
1. Add `disputeService.ts` in `src/features/disputes/services/`
2. Create `disputesSlice.ts` in `src/features/disputes/slices/`
3. Register the reducer in `src/app/rootReducer.ts`
4. Replace mock data in `DashboardPage.tsx` with real selectors/thunks

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Auth service base URL |
| `VITE_APP_ENV` | `development` | Environment name |
