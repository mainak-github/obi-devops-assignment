import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface DatabaseProps {
  vpc: ec2.IVpc;
  applicationSecurityGroup: ec2.ISecurityGroup;
}

export class Database extends Construct {
  readonly instance: rds.DatabaseInstance;
  readonly credentialsSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Database access from the application tier',
    });
    securityGroup.addIngressRule(props.applicationSecurityGroup, ec2.Port.tcp(5432), 'PostgreSQL from application');

    this.instance = new rds.DatabaseInstance(this, 'Instance', {
engine: rds.DatabaseInstanceEngine.postgres({
  version: rds.PostgresEngineVersion.of('16.15', '16')
}),      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      databaseName: 'appdb',
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [securityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('appuser'),
      allocatedStorage: 20,
      storageEncrypted: true,
      publiclyAccessible: false,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const credentialsSecret = this.instance.secret;
    if (!credentialsSecret) {
      throw new Error('Database credentials secret was not created');
    }
    this.credentialsSecret = credentialsSecret;
  }
}
