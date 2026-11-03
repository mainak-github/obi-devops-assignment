import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface EcsServicesProps {
  vpc: ec2.IVpc;
  listener: elbv2.ApplicationListener;
  loadBalancerSecurityGroup: ec2.ISecurityGroup;
  backendSecurityGroup: ec2.SecurityGroup;
  frontendSecurityGroup: ec2.SecurityGroup;
  database: rds.DatabaseInstance;
  databaseCredentialsSecret: secretsmanager.ISecret;
  imageTag: string;
  servicesEnabled: boolean;
}

export class EcsServices extends Construct {
  readonly cluster: ecs.Cluster;
  readonly backendService: ecs.FargateService;
  readonly frontendService: ecs.FargateService;
  readonly backendRepository: ecr.Repository;
  readonly frontendRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcsServicesProps) {
    super(scope, id);

    this.backendRepository = new ecr.Repository(this, 'BackendRepository', {
      repositoryName: 'obi-devops-backend',
      removalPolicy: RemovalPolicy.RETAIN,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 20, tagStatus: ecr.TagStatus.ANY }],
    });
    this.frontendRepository = new ecr.Repository(this, 'FrontendRepository', {
      repositoryName: 'obi-devops-frontend',
      removalPolicy: RemovalPolicy.RETAIN,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 20, tagStatus: ecr.TagStatus.ANY }],
    });

    props.backendSecurityGroup.addIngressRule(
      props.loadBalancerSecurityGroup,
      ec2.Port.tcp(3000),
      'Backend HTTP from the load balancer',
    );
    props.frontendSecurityGroup.addIngressRule(
      props.loadBalancerSecurityGroup,
      ec2.Port.tcp(80),
      'Frontend HTTP from the load balancer',
    );

    this.cluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc });

    const backendTask = new ecs.FargateTaskDefinition(this, 'BackendTaskDefinition', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    backendTask.addContainer('Backend', {
      image: ecs.ContainerImage.fromEcrRepository(this.backendRepository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backend', logRetention: logs.RetentionDays.ONE_MONTH }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        DB_HOST: props.database.dbInstanceEndpointAddress,
        DB_PORT: '5432',
        DB_NAME: 'appdb',
        DB_USER: 'appuser',
        DB_SSL: 'true',
      },
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.databaseCredentialsSecret, 'password'),
      },
      portMappings: [{ containerPort: 3000, protocol: ecs.Protocol.TCP }],
      healthCheck: {
        command: ['CMD-SHELL', 'node -e "fetch(\'http://localhost:3000/api/health\').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(60),
      },
    });

    this.backendService = new ecs.FargateService(this, 'BackendService', {
      cluster: this.cluster,
      taskDefinition: backendTask,
      desiredCount: props.servicesEnabled ? 1 : 0,
      assignPublicIp: false,
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      securityGroups: [props.backendSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    const frontendTask = new ecs.FargateTaskDefinition(this, 'FrontendTaskDefinition', {
      cpu: 256,
      memoryLimitMiB: 512,
    });
    frontendTask.addContainer('Frontend', {
      image: ecs.ContainerImage.fromEcrRepository(this.frontendRepository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'frontend', logRetention: logs.RetentionDays.ONE_MONTH }),
      portMappings: [{ containerPort: 80, protocol: ecs.Protocol.TCP }],
      healthCheck: {
        command: ['CMD-SHELL', 'wget -q -O /dev/null http://localhost/ || exit 1'],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        retries: 3,
        startPeriod: Duration.seconds(30),
      },
    });
    this.frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster: this.cluster,
      taskDefinition: frontendTask,
      desiredCount: props.servicesEnabled ? 1 : 0,
      assignPublicIp: false,
      circuitBreaker: { rollback: true },
      minHealthyPercent: 100,
      securityGroups: [props.frontendSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    props.listener.addTargets('FrontendTargets', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.frontendService],
      healthCheck: { path: '/', healthyHttpCodes: '200-399' },
    });
    props.listener.addTargets('BackendApiTargets', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*', '/ready'])],
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.backendService],
      healthCheck: { path: '/api/health', healthyHttpCodes: '200' },
    });
  }
}
