# OBI DevOps Assignment

A three-tier application scaffold with a React + TypeScript frontend, Node.js REST API, and AWS CDK infrastructure.

## Repository layout

```text
frontend/       React application, Vite build, and Nginx container config
backend/        Node.js REST API and service layers
infrastructure/ AWS CDK app, constructs, and stack tests
.github/        CI/CD workflows
scripts/        Local development and image utilities
docker-compose.yml
```

## Prerequisites

- Node.js 20.19+ and npm
- Docker with Docker Compose (for containerized local development)
- AWS credentials and the AWS CDK CLI (for deployment)

## Local development

Install dependencies and start the API and frontend:

```sh
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and proxies `/api` requests to the API on http://localhost:3000. Check API health at http://localhost:3000/api/health.

Run checks/builds:

```sh
npm run check
npm run build
```

To start the containerized stack instead:

```sh
docker compose up --build
```

## Infrastructure

The AWS CDK application is in `infrastructure/`. From that directory, install its dependencies, then use `npx cdk synth` to synthesize the stack. Review AWS costs, security groups, and environment-specific settings before deploying.
