#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsEpamCourseBeStack } from '../lib/aws-epam-course-be-stack';
import { ProductServiceStack } from '../lib/product-service/product-service-stack';
import { ImportServiceStack } from '../lib/import-service/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service/authorization-service-stack';

const app = new cdk.App();
new AwsEpamCourseBeStack(app, 'AwsEpamCourseBeStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});

new ProductServiceStack(app, 'ProductServiceStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});

const authorizationServiceStack = new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
});

new ImportServiceStack(app, 'ImportServiceStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
    basicAuthorizerFn: authorizationServiceStack.basicAuthorizerFn,
});
