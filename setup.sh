#!/usr/bin/env bash
# ============================================================
#  HelpMyAppliances — one-command local setup
#  Usage: bash setup.sh
#  Requirements: Docker Desktop, Node.js 20+
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[setup]${NC} $1"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $1"; }
error()   { echo -e "${RED}[setup]${NC} $1"; exit 1; }

# ── 1. Check prerequisites ───────────────────────────────────────────────────
info "Checking prerequisites..."
command -v docker  >/dev/null 2>&1 || error "Docker not found. Install Docker Desktop: https://www.docker.com/products/docker-desktop"
command -v node    >/dev/null 2>&1 || error "Node.js not found. Install from https://nodejs.org (v20+)"
docker info        >/dev/null 2>&1 || error "Docker is not running. Please start Docker Desktop."
info "Prerequisites OK"

# ── 2. Set up backend .env ───────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  info "Creating backend/.env from template (EURI key pre-configured)..."
  cp backend/env.dev backend/.env
  info "backend/.env created"
else
  info "backend/.env already exists, skipping"
fi

# ── 3. Set up web .env.local ─────────────────────────────────────────────────
if [ ! -f web/.env.local ]; then
  info "Creating web/.env.local from template..."
  cp web/env.dev web/.env.local
else
  info "web/.env.local already exists, skipping"
fi

# ── 4. Install web dependencies ──────────────────────────────────────────────
info "Installing web dependencies..."
(cd web && npm install --silent)
info "npm install done"

# ── 5. Start backend services (Docker) ──────────────────────────────────────
info "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis
info "Waiting for PostgreSQL to be ready..."
until docker compose exec -T postgres pg_isready -U app -d helpmyappliances >/dev/null 2>&1; do
  sleep 1
done
info "PostgreSQL ready"

# ── 6. Run database migrations ───────────────────────────────────────────────
info "Running database migrations..."
docker compose run --rm backend alembic upgrade head
info "Migrations done"

# ── 7. Start backend ─────────────────────────────────────────────────────────
info "Starting backend API..."
docker compose up -d backend
sleep 2

# ── 8. Start web dev server ──────────────────────────────────────────────────
info "Starting web frontend..."
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅  HelpMyAppliances is starting!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Web app  → http://localhost:3000"
echo "  API docs → http://localhost:8000/api/docs"
echo ""
echo "  Login with any email address — your data is private to that email."
echo "  (Dev mode: no Firebase/Google account required)"
echo ""
if grep -q "^EURI_API_KEY=$" backend/.env 2>/dev/null; then
  echo -e "${YELLOW}  ⚠️  AI features won't work until you add your EURI_API_KEY to backend/.env${NC}"
  echo ""
fi
echo "  Press Ctrl+C to stop the web server."
echo ""

(cd web && npm run dev)
