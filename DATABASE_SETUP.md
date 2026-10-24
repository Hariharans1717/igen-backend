# Database setup

The backend requires PostgreSQL. Set either `DATABASE_URL` or `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in the backend environment.

Run the schema setup manually when provisioning a database:

```sh
npm run setup-db
```

The production start command also runs this setup automatically before the
server starts. The schema uses `IF NOT EXISTS`, so restarting the service is
safe and does not recreate existing tables or the initial admin user.
