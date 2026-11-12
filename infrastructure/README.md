# AWS CDK quick start

From the repository root:

```bash
cd infrastructure
npm ci
npx cdk synth
npx cdk deploy
```

The first deploy creates ECR repositories and infrastructure with ECS desired counts set to zero. After pushing both images to the output ECR repositories under the same full 40-character commit SHA, deploy the services with `npx cdk deploy -c servicesEnabled=true -c imageTag="$GIT_COMMIT_SHA"`.

RDS generates its username and password in AWS Secrets Manager, and ECS injects the password into the backend task from that secret at runtime. The database is placed in isolated private subnets and is not publicly accessible. Security groups allow public HTTP only to the ALB, task ingress only from the ALB, and PostgreSQL ingress only from the backend task security group.

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

The GitHub Actions workflow validates, synthesizes, builds and pushes both images on pushes to `main`, then deploys the stack through GitHub OIDC. The deploy job requires the configured `GitHubActionsDeployRole`, account/region values, and a valid OIDC trust policy for this repository.
