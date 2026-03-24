# Traditional User Management API

A standard Express.js + TypeScript user management API (control group for agent-native repo experiment).

## Structure

```
src/
├── controllers/     # Request handlers
├── models/          # Data models and types
├── routes/          # Route definitions
├── middleware/      # Auth middleware
└── utils/           # Database utilities
```

## API Endpoints

- `POST /users` - Create user
- `GET /users/:id` - Get user by ID (auth required)
- `PUT /users/:id` - Update user (auth required)
- `DELETE /users/:id` - Delete user (auth required)
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout (auth required)

## Running

```bash
npm install
npm test
npm run dev
```

## Notes

- Uses in-memory Maps as database (no external DB)
- Known bug: DELETE /users/:id does not invalidate active sessions
