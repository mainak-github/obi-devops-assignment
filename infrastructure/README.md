# CDK deployment stages

The CDK stack defaults to a bootstrap stage: it creates the ECR repositories and supporting infrastructure, but keeps both ECS services at `desiredCount: 0`. This lets the repositories exist before ECS attempts to pull application images. The stage still creates billable AWS resources, including the NAT gateway, ALB, and RDS instance; review the estimate and account setup before deploying it.

The PostgreSQL instance has seven days of backups, deletion protection, and a retain removal policy. Deleting the stack will leave the database and its ongoing charges in the account until it is handled separately.

From `infrastructure/`, deploy the bootstrap stage only after AWS account, credentials, permissions, and costs have been reviewed:

```bash
npx cdk deploy
```

Use the `BackendRepositoryUri` and `FrontendRepositoryUri` stack outputs to build and push both application images with the same full commit SHA tag. Once both images exist in ECR, enable the ECS services with that tag:

```bash
npx cdk deploy \
  --context servicesEnabled=true \
  --context imageTag="$GIT_COMMIT_SHA"
```

`GIT_COMMIT_SHA` must be the full 40-character commit SHA. The ECR repositories reject mutable tags, scan images on push, and retain the most recent 20 images. For later releases, push both new SHA-tagged images before running the second deploy command.

The GitHub Actions workflow currently validates, tests, synthesizes, and builds images. Its deploy job remains a placeholder until AWS OIDC role and account settings are configured and deployment is approved.
