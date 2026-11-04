# Login (local development)

Stop the server with Ctrl+C, then run from backend:

```powershell
npm.cmd run db:migrate
npm.cmd run auth:create-user
npm.cmd run dev
```

Choose a username using 3–32 lowercase letters/numbers/underscores and a password with at least 8 characters.
The command asks twice for the password without displaying it. This is a separate website account, not your PostgreSQL account.
Passwords are stored as salted scrypt hashes; there is no default password.
Public registration at /register creates pending viewer accounts only. Administrators approve them from the Dashboard.
Use auth:create-user on this computer to create the first administrator. Use a distinct username from any pending signup.
Approved viewers may read incubator data but cannot edit incubation dates or approve users.
Do not put the website password in .env, source code, command arguments or GitHub.
Existing usernames are not overwritten by this command.

Open http://127.0.0.1:3000/login. Dashboard and incubator APIs require login.
Sessions expire after 8 hours. Logout revokes the session in PostgreSQL.
The database stores only a SHA-256 digest of each random session token.
Cookies are HttpOnly and SameSite=Strict. Secure cookies are enabled with NODE_ENV=production; production additionally requires HTTPS.
The development server remains localhost-only. This is not a deployment-ready authentication review.
Login attempts are limited to 10 per 15 minutes per IP in this single-process local server.
Restarting the process resets this limiter; production needs a shared limiter behind the configured proxy.
/api/health remains public for diagnostics. No ESP32 ingestion is enabled by adding user login.
