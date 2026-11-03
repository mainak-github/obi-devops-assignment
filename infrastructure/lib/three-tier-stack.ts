import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Networking } from './constructs/networking';
import { LoadBalancer } from './constructs/load-balancer';
import { EcsServices } from './constructs/ecs-services';
import { Database } from './constructs/database';

export class ThreeTierStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const servicesEnabled = this.node.tryGetContext('servicesEnabled') === true
      || this.node.tryGetContext('servicesEnabled') === 'true';
    const requestedImageTag = this.node.tryGetContext('imageTag');
    const imageTag = requestedImageTag ? String(requestedImageTag) : 'bootstrap';
    if (servicesEnabled && !/^[0-9a-f]{40}$/i.test(imageTag)) {
      throw new Error('Set imageTag to a full 40-character commit SHA when enabling ECS services');
    }

    const networking = new Networking(this, 'Networking');
    const loadBalancer = new LoadBalancer(this, 'LoadBalancer', { vpc: networking.vpc });
    const backendSecurityGroup = new ec2.SecurityGroup(this, 'BackendSecurityGroup', {
      vpc: networking.vpc,
      description: 'Backend task ingress from the load balancer only',
      allowAllOutbound: true,
    });
    const frontendSecurityGroup = new ec2.SecurityGroup(this, 'FrontendSecurityGroup', {
      vpc: networking.vpc,
      description: 'Frontend task ingress from the load balancer only',
      allowAllOutbound: true,
    });

    const database = new Database(this, 'Database', {
      vpc: networking.vpc,
      applicationSecurityGroup: backendSecurityGroup,
    });
    const services = new EcsServices(this, 'Services', {
      vpc: networking.vpc,
      listener: loadBalancer.listener,
      loadBalancerSecurityGroup: loadBalancer.securityGroup,
      backendSecurityGroup,
      frontendSecurityGroup,
      database: database.instance,
      databaseCredentialsSecret: database.credentialsSecret,
      imageTag,
      servicesEnabled,
    });

    new CfnOutput(this, 'ApplicationUrl', {
      value: `http://${loadBalancer.loadBalancer.loadBalancerDnsName}`,
    });
    new CfnOutput(this, 'DatabaseSecretArn', {
      value: database.credentialsSecret.secretArn,
    });
    new CfnOutput(this, 'BackendRepositoryUri', {
      value: services.backendRepository.repositoryUri,
    });
    new CfnOutput(this, 'FrontendRepositoryUri', {
      value: services.frontendRepository.repositoryUri,
    });
  }
}
