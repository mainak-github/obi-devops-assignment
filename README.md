# OBI DevOps Assignment — Submission Documentation

**Candidate:** Mainak Bhattacherjee

**Repository:** obi-devops-assignment
**Last deployment and endpoint check:** 22 November 2026

## 1. Assignment objective

This submission implements a three-tier records application:

1. A React and TypeScript frontend
2. An Express REST API
3. A PostgreSQL database

Users can create, view, and delete records. The API stores records in PostgreSQL; refreshing the page loads them from the database again. The frontend and backend run as separate services in Docker Compose and AWS ECS.

## 2. Deployed application

| Environment | Public application URL | Deployment |
| --- | --- | --- |
| Production | [Open production](http://ObiDev-LoadB-mNBQH5t6opm6-681051659.ap-south-1.elb.amazonaws.com) | Existing production CDK stack and ECS services |
| Staging | [Open staging](http://ObiDev-LoadB-hTWKDAlluglu-308141241.ap-south-1.elb.amazonaws.com) | Separate staging CDK stack and ECS services |

Both environments are served through a public Application Load Balancer over HTTP. The ALB routes the frontend path to the frontend ECS service and API paths to the backend ECS service. PostgreSQL is private and accepts traffic from the backend tier.

## 3. Architecture and request flow

    Browser
      |
      | GET /
      v
    Public Application Load Balancer
      |                         |
      | /                       | /api/* and /ready
      v                         v
    Frontend ECS service     Backend ECS service
    React build + Nginx      Express REST API
                                  |
                                  | PostgreSQL over private network
                                  v
                              RDS PostgreSQL

The backend reads its database password from AWS Secrets Manager through the ECS task definition. The database is in private isolated subnets. The frontend container serves the static application independently of the database. In ECS, the ALB sends API traffic directly to the backend. In Docker Compose, the frontend’s Nginx configuration proxies /api to the backend service name.

The backend creates the records table idempotently when the API is first used. SQL values are parameterized. A record contains an identity ID, title, details, and creation timestamp.

## 4. User functionality and API

The page provides a form to add a record, a list of saved records, a refresh action, and a delete action. If the API is unavailable, the frontend remains served and shows an API error message.

| Method and path | Purpose |
| --- | --- |
| GET /api/health | Backend process health; does not require the database |
| GET /ready | Database readiness; returns HTTP 200 when connected and HTTP 503 when unavailable |
| GET /api/v1/records | Return saved records from PostgreSQL |
| POST /api/v1/records | Create a record using JSON with a required title and optional details |
| DELETE /api/v1/records/:id | Delete a record by ID |

Example create request:

    curl -X POST http://localhost:8080/api/v1/records \
      -H 'Content-Type: application/json' \
      -d '{"title":"Assignment note","details":"Persisted in PostgreSQL"}'

## 5. Run the application locally

### Requirements

- Docker Desktop or Docker Engine
- Docker Compose v2

### Start

From the repository root, run:

    docker compose up --build

Open http://localhost:8080. The API is also published at http://localhost:3000. The Compose services are:

- db — PostgreSQL 16, with a persistent named volume
- backend — Express API on port 3000
- frontend — Nginx-served React application on port 8080

Compose uses a local-only fallback password so the first run works without a credentials file. It is only for disposable local development. To override it, set DB_PASSWORD in an ignored root .env file. Never use local demo credentials in AWS or commit real credentials.

Stop the services with:

    docker compose down

The named database volume is retained by this command, so saved records remain on a later start. To erase the local database and its records intentionally:

    docker compose down -v

### Optional hot reload

For frontend and backend development outside the containers:

1. Start PostgreSQL with Docker Compose.
2. Copy backend/.env.example to backend/.env and set the local database values.
3. Install root and frontend dependencies with npm ci and npm ci --prefix frontend.
4. Run npm run dev from the repository root.

The Vite frontend runs on port 5173 and proxies /api to the backend on port 3000.

## 6. AWS deployment

Infrastructure is defined with AWS CDK in infrastructure/. The production and staging stacks each contain a VPC, public ALB, private ECS Fargate services, private RDS PostgreSQL, ECR repositories, and Secrets Manager integration. Images are tagged with the full source commit SHA and ECR repositories use immutable tags.

Current ECR repositories:

- Production: obi-devops-backend and obi-devops-frontend
- Staging: obi-devops-backend-staging and obi-devops-frontend-staging

The deployments documented above were made from commit fc877bc6ed884f9b8be7480414ae8c1dc41423c2. Each environment has its own database, load balancer, and services. These AWS resources incur ongoing charges. RDS has deletion protection and a retain policy; do not delete a stack without separately considering retained databases and ongoing costs.

### GitHub Actions deployment

The workflow is .github/workflows/deploy.yml.

- Pull requests targeting develop or main run validation, TypeScript checks, application builds, infrastructure build/tests/synthesis, and Docker image builds.
- A push to develop deploys staging.
- A push to main deploys production after the production GitHub Environment gate is satisfied.
- The workflow publishes SHA-tagged images to ECR, deploys the matching CDK stack, then checks /ready and /api/health.
- AWS access uses GitHub OIDC; no long-lived AWS access keys belong in GitHub secrets.

### GitHub configuration required to enable automatic deployment

The workflow is in the repository, but GitHub branch protections and deployment environments must be configured in repository settings. The connected GitHub integration did not have administration access when this document was prepared.

1. Create a develop branch from main.
2. Protect develop and main. Require pull requests, at least one approval, the Validate, build, and package status check, and current approvals after new commits. Disable force pushes and branch deletion.
3. Create GitHub Environments named staging and production. Restrict staging deployments to develop. Restrict production deployments to main and require an authorized reviewer.
4. In each environment, set AWS_REGION to ap-south-1, AWS_ACCOUNT_ID to the AWS account used for the stacks, and APP_URL to that environment’s URL from Section 2.
5. Set AWS_DEPLOY_ROLE_ARN as an environment secret. Its OIDC trust policy must allow the repository’s staging and production environment subjects.
6. Extend the deployment role policy to publish to the staging ECR repositories as well as production repositories. Keep ECR access scoped to these repositories and retain the OIDC subject restrictions.

The existing deployment role currently trusts a main-branch subject and its ECR permissions cover the production repositories. Update those settings before expecting GitHub Actions to assume the role and deploy staging. Until the GitHub settings and IAM policy are configured, the AWS environments are deployed and reachable, but automatic GitHub deployments are not fully enabled.

## 7. Branching and promotion workflow

Use short-lived branches from develop:

- feature/<change> for application work
- fix/<change> for defect fixes
- docs/<change> for documentation

Open a pull request from the short-lived branch to develop. After checks and review pass, merge to deploy to staging. Promote by opening a pull request from develop to main. After merge, the protected production Environment approval gates the production deployment.

The implementation branch for this submission is codex/functional-three-tier-deployment. It has been pushed to GitHub; main was not changed. Create the develop branch and apply its protection rules before using the staged promotion workflow.

## 8. Acceptance criteria and verification

| Requirement | Result |
| --- | --- |
| Public frontend deployment | Verified in production and staging |
| Create, view, and delete records | Verified against both public APIs |
| Database persistence after a fresh request/refresh | Verified by reading a created record again before deleting it |
| Frontend remains accessible during database outage | Verified in staging: GET / returned HTTP 200 while RDS was stopping |
| Backend readiness reports database outage | Verified in staging: GET /ready returned HTTP 503 during the outage |
| Database recovery | RDS was restarted; /ready returned HTTP 200 afterward |
| Production endpoints | On 22 November 2026, /, /ready, /api/health, and /api/v1/records each returned HTTP 200 |
| Staging endpoints | On 22 November 2026, /, /ready, /api/health, and /api/v1/records each returned HTTP 200 |
| Backend and frontend image builds | Built successfully for the deployed revision |
| Frontend TypeScript validation and production build | Passed |
| CDK TypeScript build and synthesis | Passed |
| Docker Compose configuration | docker compose config passed |
| Full local Compose runtime | Configured for docker compose up --build; not separately exercised in this deployment session |
| GitHub Actions run and protected branch/environment gates | Workflow is committed; repository rules, environment approvals, and an Actions run are still pending |
| End-to-end demonstration video | Not yet recorded; use Section 9 as the recording checklist |

## 9. End-to-end video demonstration checklist

Record a 2–3 minute capture with the public production URL visible:

1. Load the production page.
2. Create a record with a recognizable title and details.
3. Refresh the page and show the record remains.
4. Delete the record, refresh again, and show it stays deleted.
5. Show GET /api/health and GET /ready returning HTTP 200.
6. In staging only, stop or isolate PostgreSQL. Show the frontend still loads and /ready returns HTTP 503. Restore PostgreSQL and show /ready return HTTP 200.
7. Show the workflow run for the deployed commit and the staging-to-production promotion after GitHub protections are configured.

Do not show credentials, secret values, or environment files. Do not perform the outage demonstration against production.

## 10. Repository map

- frontend/ — React + TypeScript application, Nginx config, and Dockerfile
- backend/ — Express API, PostgreSQL pool, health/readiness routes, and Dockerfile
- infrastructure/ — AWS CDK application and ECS, ALB, VPC, RDS, ECR, and Secrets Manager constructs
- three-tier-app/ — optional Kubernetes Helm chart for the same application
- .github/workflows/deploy.yml — validation and staged deployment workflow
- docker-compose.yml — reproducible local three-service application
