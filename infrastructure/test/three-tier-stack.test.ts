import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ThreeTierStack } from '../lib/three-tier-stack';

describe('ThreeTierStack', () => {
  test('creates a staged network, database, repositories, and two ECS services', () => {
    const app = new App();
    const stack = new ThreeTierStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::EC2::NatGateway', 1);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::ECS::Service', 2);
    template.resourceCountIs('AWS::ECR::Repository', 2);
    template.resourceCountIs('AWS::RDS::DBInstance', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
    template.resourceCountIs('AWS::ElasticLoadBalancingV2::ListenerRule', 1);

    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBInstanceClass: 'db.t4g.micro',
      DBName: 'appdb',
      PubliclyAccessible: false,
      StorageEncrypted: true,
      BackupRetentionPeriod: 7,
    });
    const dbSubnetGroups = template.findResources('AWS::RDS::DBSubnetGroup');
    const dbSubnetGroup = Object.values(dbSubnetGroups)[0] as {
      Properties: { SubnetIds: unknown[] };
    };
    expect(dbSubnetGroup.Properties.SubnetIds).toHaveLength(2);
    expect(JSON.stringify(dbSubnetGroup.Properties.SubnetIds)).toContain('isolated');

    const subnets = Object.values(template.findResources('AWS::EC2::Subnet'));
    for (const subnetType of ['Public', 'Private', 'Isolated']) {
      expect(subnets.filter((subnet) =>
        (subnet.Properties as { Tags: Array<{ Key: string; Value: string }> }).Tags.some(
          (tag) => tag.Key === 'aws-cdk:subnet-type' && tag.Value === subnetType,
        ),
      )).toHaveLength(2);
    }

    template.hasResourceProperties('AWS::ECR::Repository', {
      ImageTagMutability: 'IMMUTABLE',
      ImageScanningConfiguration: { ScanOnPush: true },
    });
    template.hasResourceProperties('AWS::ElasticLoadBalancingV2::ListenerRule', {
      Priority: 10,
      Conditions: [{
        Field: 'path-pattern',
        PathPatternConfig: { Values: ['/api/*'] },
      }],
    });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 5432,
      ToPort: 5432,
      SourceSecurityGroupId: Match.anyValue(),
    });
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'DB_PASSWORD' })]),
        }),
      ]),
    });
    template.hasResourceProperties('AWS::ECS::Service', { DesiredCount: 0 });
  });

  test('uses the requested commit image tag when ECS services are enabled', () => {
    const imageTag = '0123456789abcdef0123456789abcdef01234567';
    const app = new App({ context: { imageTag, servicesEnabled: true } });
    const stack = new ThreeTierStack(app, 'EnabledTestStack');
    const template = Template.fromStack(stack);

    template.resourceCountIs('AWS::ECS::Service', 2);
    template.hasResourceProperties('AWS::ECS::Service', { DesiredCount: 1 });
    expect(JSON.stringify(template.findResources('AWS::ECS::TaskDefinition'))).toContain(imageTag);
  });
});
