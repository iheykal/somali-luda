@echo off
echo Setting environment variables for local development...

set NODE_ENV=production
set CONNECTION_URI=mongodb+srv://ludo:ilyaas@ludo.1umgvpn.mongodb.net/ludo?retryWrites=true^&w=majority^&appName=ludo
set JWT_SECRET=8f9a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7
set FRONTEND_URL=https://ludo-252.onrender.com
set VITE_API_URL=/api
set VITE_USE_REAL_API=true

echo.
echo Environment variables set successfully!
echo.
echo These variables are set for the current CMD session only.
echo To verify, run: echo %NODE_ENV%
echo.

