#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { ThreeTierStack } from '../lib/three-tier-stack';

const app = new App();
const stage = String(app.node.tryGetContext('stage') || 'dev').toLowerCase();
if (!/^[a-z][a-z0-9-]{0,11}$/.test(stage)) {
  throw new Error('CDK context stage must be a short lowercase identifier');
}
const stackName = stage === 'production'
  ? 'ObiDevopsThreeTierStack'
  : `ObiDevopsThreeTierStack-${stage}`;
new ThreeTierStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
