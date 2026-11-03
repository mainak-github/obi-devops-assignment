import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

interface LoadBalancerProps {
  vpc: ec2.IVpc;
}

export class LoadBalancer extends Construct {
  readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  readonly listener: elbv2.ApplicationListener;
  readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id);
    this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: props.vpc,
      description: 'Public HTTP ingress to the application load balancer',
      allowAllOutbound: true,
    });
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
      vpc: props.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: this.securityGroup,
    });
    this.listener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      open: true,
    });
  }
}
