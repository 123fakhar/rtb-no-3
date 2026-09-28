# RTB Portal — Production Deployment & Operations Guide

Welcome to the **Seagulls Communications Real-Time Bidding (RTB) & CRM Portal**. This guide covers local development, Docker deployment, Hostinger VPS setup, zero-downtime CI/CD automation via GitHub Actions, and operational maintenance.

---

## 1. Quick Overview

Once initial setup is complete, your day-to-day workflow is fully automated:

```bash
git add .
git commit -m "Add new buyer rule"
git push origin main
```

Upon pushing to `main`, GitHub Actions automatically:
1. Validates and runs type checks on backend and frontend.
2. Builds the Docker containers.
3. Securely SSHs into your **Hostinger VPS**.
4. Pulls the latest code and updates the containers with **minimal/zero downtime**.
5. Preserves all PostgreSQL database records in persistent Docker volumes.
6. Performs an automated health check to confirm the site is live.

---

## 2. Architecture & Service Topology

| Component | Technology | Default Port | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) + Tailwind + Recharts | `80` (or `3000`) | Admin Console & Agent Portal UI |
| **Backend** | Express + TypeScript + Prisma ORM | `4000` (internal) | RTB routing engine, Ping adapters, CRM API |
| **Database** | PostgreSQL 16 (Alpine) | `5432` (internal) | Persistent storage for leads, buyers, pings, users |
| **Volume** | `rtb_postgres_data` | — | Docker persistent volume (data survives updates) |

---

## 3. Local Development (Without Docker)

### Prerequisites
- Node.js `v20+` or `v24+`
- PostgreSQL running locally or via Docker

### Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
# Set DATABASE_URL=postgresql://rtb:rtb@localhost:5432/rtb?schema=public

# Generate client, migrate database, and seed initial buyers/agents:
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start dev server:
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 4. Running with Docker Locally

To test the full multi-container stack on your computer:

```bash
# 1. Create your local .env file
cp .env.example .env

# 2. Build and launch all services
docker compose up --build -d

# 3. View status and health
docker compose ps
docker compose logs -f
```

The portal will be accessible at `http://localhost`.

---

## 5. Setting up Hostinger VPS (One-Time Setup)

### Step 5.1: Install Docker & Docker Compose on your VPS
SSH into your Hostinger VPS:
```bash
ssh root@<YOUR_VPS_IP>
```

Run the standard Docker installation:
```bash
# Update packages
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify Docker and Compose
docker --version
docker compose version
```

### Step 5.2: Configure Firewall (UFW)
Ensure HTTP, HTTPS, and SSH ports are allowed:
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### Step 5.3: Generate Deployment SSH Key Pair
On your local machine (or in VPS):
```bash
ssh-keygen -t ed25519 -C "github-actions-rtb" -f ~/.ssh/rtb_deploy_key
```

Add the public key (`~/.ssh/rtb_deploy_key.pub`) to your VPS's `~/.ssh/authorized_keys`:
```bash
cat ~/.ssh/rtb_deploy_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Keep the private key (`~/.ssh/rtb_deploy_key`) safe — you will add it to GitHub Secrets in the next step.

### Step 5.4: Prepare the Deployment Directory on VPS
```bash
mkdir -p /var/www/rtb-portal
cd /var/www/rtb-portal

# Clone repository initially (or let GitHub Actions clone it)
git clone <YOUR_GITHUB_REPO_URL> .

# Setup production environment file
cp .env.example .env
nano .env
```

Set your strong database password and secrets in `/var/www/rtb-portal/.env`.

---

## 6. Configuring GitHub Repository Secrets

Go to your repository on GitHub:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following required secrets:

| Secret Name | Value Example | Description |
| :--- | :--- | :--- |
| `VPS_HOST` | `185.192.12.34` (or your domain) | Your Hostinger VPS IP address |
| `VPS_USER` | `root` | The SSH username on the VPS |
| `VPS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY----- ...` | The private key content from Step 5.3 |
| `VPS_SSH_PORT` | `22` | SSH port (default: 22) |
| `VPS_TARGET_DIR` | `/var/www/rtb-portal` | Directory path where code lives on VPS |

---

## 7. Zero-Downtime Deployment Workflow

Once configured, the workflow defined in `.github/workflows/deploy.yml` runs automatically on every `git push`:

```
Local Code (Cursor)
       ↓  (git push)
GitHub Repository (main branch)
       ↓
GitHub Actions
       ├── 1. Checkout code
       ├── 2. Run TypeScript linting & builds
       └── 3. Connect via SSH to Hostinger VPS
                   ↓
Hostinger VPS Server
       ├── Git pull latest changes
       ├── docker compose build (pre-builds new images)
       ├── docker compose up -d (replaces containers seamlessly)
       └── Health check verification (http 200 check)
```

### Why Data is Never Lost:
- PostgreSQL uses the named Docker volume `rtb_postgres_data`.
- Running `docker compose up -d` restarts the app containers with new code without touching the volume or dropping data.

---

## 8. Managing and Monitoring the Production VPS

### Check Container Status
```bash
cd /var/www/rtb-portal
docker compose ps
```

### View Live Logs
```bash
# All services
docker compose logs -f --tail=50

# Specific service (backend or frontend)
docker compose logs -f backend
docker compose logs -f frontend
```

### Manual Restart
If you ever need to manually restart services:
```bash
docker compose restart
```

### Rollback to a Previous Commit
If an unexpected issue occurs, you can rollback immediately:
```bash
cd /var/www/rtb-portal
git log --oneline -n 5
git reset --hard <PREVIOUS_COMMIT_HASH>
docker compose up -d --build
```

---

## 9. Seeded Default Accounts

The system comes pre-seeded with standard test and production templates:

- **Admin Account**:
  - Email: `admin@rtb.local`
  - Password: `admin12345`
  - Access: Full configuration, buyer management, RTB APIs, approvals, analytics

- **Agent Accounts**:
  - Over 25 agent IDs pre-generated: `agent1@rtb.local` through `agent25@rtb.local`
  - Password: `agent12345`
  - Access: Lead submission, buyer routing workspace, CRM entry submission
