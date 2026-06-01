# Nivano Care Oracle Cloud Deployment

This guide deploys the MVP to an Oracle Cloud Ubuntu VM with Docker Compose.

## VM Requirements

- Ubuntu 22.04 LTS or 24.04 LTS
- Docker Engine
- Docker Compose plugin
- Git
- At least 2 vCPU and 4 GB RAM recommended for a private MVP demo
- Oracle Cloud ingress rules for the public ports listed below

## Required Public Ports

For the current direct-port MVP deployment:

- `22` SSH
- `5173` Frontend
- `8001` Auth API
- `8002` User API
- `8003` Shift API
- `8004` Compliance API

Do not open Postgres publicly. Port `5432` should remain private/internal.

For a later production hardening pass, put Nginx/Caddy in front of the app and expose only `80` and `443`.

## Environment File

On the VM, copy the deployment template and edit the values:

```bash
cp .env.example.deploy .env
nano .env
```

Required variables:

```env
DB_USER=nivano_user
DB_PASSWORD=CHANGE_ME_STRONG_DATABASE_PASSWORD
DB_NAME=nivano_db

JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

CORS_ORIGINS=http://VM_PUBLIC_IP_OR_DOMAIN:5173

VITE_AUTH_API_URL=http://VM_PUBLIC_IP_OR_DOMAIN:8001
VITE_USER_API_URL=http://VM_PUBLIC_IP_OR_DOMAIN:8002
VITE_SHIFT_API_URL=http://VM_PUBLIC_IP_OR_DOMAIN:8003
VITE_COMPLIANCE_API_URL=http://VM_PUBLIC_IP_OR_DOMAIN:8004
COMPLIANCE_PUBLIC_URL=http://VM_PUBLIC_IP_OR_DOMAIN:8004

FRONTEND_PORT=5173
AUTH_SERVICE_PORT=8001
USER_SERVICE_PORT=8002
SHIFT_SERVICE_PORT=8003
COMPLIANCE_SERVICE_PORT=8004
POSTGRES_PORT=5432

ENVIRONMENT=production
```

Replace `VM_PUBLIC_IP_OR_DOMAIN` with the VM public IP address or DNS name.

Notes:

- `JWT_SECRET` must be the same for all backend services. Docker Compose passes it to auth, user, shift, and compliance services.
- `CORS_ORIGINS` must match the browser origin exactly, including port.
- Vite API URLs are build-time values. If you change any `VITE_*` URL, rebuild the frontend image with `docker compose build frontend` or rebuild the full stack.
- `COMPLIANCE_PUBLIC_URL` must be reachable from the browser so uploaded credential documents can open correctly.
- Do not commit real `.env` secrets.

## Install Docker On Ubuntu

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in after adding your user to the Docker group, or prefix Docker commands with `sudo`.

## Deploy

```bash
git clone <your-repository-url>
cd Nivano_MVP
cp .env.example.deploy .env
nano .env

docker compose build
docker compose run --rm migration-runner alembic upgrade head
docker compose run --rm migration-runner python seed_demo.py
docker compose up -d
docker compose ps
```

## Service URLs

- Frontend: `http://VM_PUBLIC_IP_OR_DOMAIN:5173`
- Auth API docs: `http://VM_PUBLIC_IP_OR_DOMAIN:8001/docs`
- User API docs: `http://VM_PUBLIC_IP_OR_DOMAIN:8002/docs`
- Shift API docs: `http://VM_PUBLIC_IP_OR_DOMAIN:8003/docs`
- Compliance API docs: `http://VM_PUBLIC_IP_OR_DOMAIN:8004/docs`

## Demo Accounts

The seed script creates production-like demo data:

- Admin: `admin@test.com`
- Nurse: `nurse@test.com`
- Healthcare Organization: `facility@test.com`

Use the passwords configured by `seed_demo.py`.

## Common Operations

Rebuild after changing frontend API URLs:

```bash
docker compose build frontend
docker compose up -d frontend
```

Run migrations:

```bash
docker compose run --rm migration-runner alembic upgrade head
```

Reset demo data:

```bash
docker compose run --rm migration-runner python seed_demo.py
```

View logs:

```bash
docker compose logs -f
```

Stop the stack:

```bash
docker compose down
```

## Deployment Notes

- This MVP deployment exposes service ports directly for a private demo.
- For a public or long-running deployment, add TLS, a reverse proxy, backups, monitoring, and stricter network rules.
- Keep Postgres private. Do not add a public Oracle ingress rule for `5432`.
- Address autocomplete and map integration are future work.
