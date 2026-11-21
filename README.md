# OBI DevOps assignment

A working three-tier records application: React frontend → Express API → PostgreSQL. Records are persisted in the database and remain available after refresh.

## Run locally

Requirements: Docker with the Compose plugin. From the repository root:

```sh
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). The app stores local demo data in the named `postgres_data` volume. The Compose-only fallback credential is for disposable development data; set `DB_PASSWORD` in an ignored root `.env` file for a local override. Never use the Compose credential outside local development. Stop with `docker compose down`; use `docker compose down -v` only when you intend to erase the local database.

For hot reload, run `npm ci`, `npm ci --prefix frontend`, then `npm run dev`. The frontend runs on port 5173 and the backend on port 3000. Copy `backend/.env.example` to `backend/.env` and set local PostgreSQL connection values first.

## Acceptance criteria

- [ ] The deployed public URL loads the frontend over HTTP.
- [ ] A user can create a record with a title and optional details.
- [ ] The list is read from the backend API and PostgreSQL, not browser-only state.
- [ ] A user can delete a record; refresh preserves creates and deletes.
- [ ] The API is reachable under `/api`; `GET /api/health` checks process health.
- [ ] `GET /ready` returns 200 when PostgreSQL is reachable and 503 when it is not.
- [ ] Frontend and backend are separate services. The frontend serves its static UI without a database connection and displays an API outage message when the API cannot load records.
- [ ] The same images and API routes run through Docker Compose and ECS.
- [ ] No production secret is committed. ECS reads the RDS password from Secrets Manager.
- [ ] Pull requests run validation, frontend type checking/build, infrastructure synthesis/tests, and Docker builds.
- [ ] Changes move from feature branch → `develop` (staging) → pull request → `main` (production). Protect both long-lived branches with required pull request reviews and required CI checks.
- [ ] Production deployment uses a protected GitHub Environment with required reviewers; staging and production each have separate AWS role, URL, and environment variables.
- [ ] Submit an end-to-end screen recording showing add, refresh/persistence, delete, and the deployed public URL.

Use the [demo recording walkthrough](docs/demo-script.md) as the capture checklist.

## Branch and release workflow

Use short-lived branches named `feature/<change>`, `fix/<change>`, or `docs/<change>`, based on `develop`. Open a pull request into `develop`; after checks pass and review is complete, merge it to deploy to staging. Promote by opening a pull request from `develop` into `main`. A successful CI run and approval in the protected `production` GitHub Environment are required before production deploy. Protect `develop` and `main` in repository settings; GitHub cannot enforce branch protection from this repository alone.

## CI/CD configuration

The workflow is `.github/workflows/deploy.yml`. Configure GitHub Environments named `staging` and `production`. For each environment set variables `AWS_REGION`, `AWS_ACCOUNT_ID`, and `APP_URL`, plus secret `AWS_DEPLOY_ROLE_ARN`. The role trust policy must allow GitHub OIDC for this repository and the corresponding environment. Restrict production to required reviewers and the `main` branch; restrict staging to `develop`. No AWS keys or deployment credentials belong in repository files.

The workflow deploys separate CDK stacks and ECR repositories for staging and production, tagged by commit SHA. Each stage needs its own resources and URL. Set its account and region through its GitHub Environment variables. The first deployment provisions infrastructure including RDS, NAT, and ALB, which incur AWS charges. Review cost and account access before enabling environments.

## API

- `GET /api/health` — process liveness
- `GET /ready` — database readiness
- `GET /api/v1/records` — list records
- `POST /api/v1/records` — create `{ "title": "...", "details": "..." }`
- `DELETE /api/v1/records/:id` — delete a record

The backend creates the `records` table idempotently on first API use. SQL values are parameterized. Database connectivity is required for CRUD, but not for the static frontend.

## Repository layout

`frontend/` React + TypeScript UI and Nginx image · `backend/` Express API and PostgreSQL integration · `infrastructure/` AWS CDK VPC, ALB, ECS, RDS, and Secrets Manager · `three-tier-app/` optional Helm chart · `.github/workflows/` validation and staged deployment.

See [infrastructure/README.md](infrastructure/README.md) and [three-tier-app/README.md](three-tier-app/README.md) for platform-specific notes.
