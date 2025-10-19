import { main as basicAuthorizer } from '../lib/authorization-service/basicAuthorizer';

const methodArn = 'arn:aws:execute-api:us-east-1:123456789012:apiId/stage/GET/import';

describe('basicAuthorizer', () => {
  const USER = 'TESTUSER';
  beforeAll(() => {
    process.env[USER] = 'TEST_PASSWORD';
  });

  test('returns 401 (throws Unauthorized) when no token', async () => {
    await expect(basicAuthorizer({ type: 'TOKEN', methodArn } as any)).rejects.toThrow('Unauthorized');
  });

  test('denies malformed token', async () => {
    const res = await basicAuthorizer({ type: 'TOKEN', methodArn, authorizationToken: 'BasicNoSpace' } as any);
    expect(res.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('denies invalid credentials', async () => {
    const encoded = Buffer.from(`${USER}:WRONG`).toString('base64');
    const res = await basicAuthorizer({ type: 'TOKEN', methodArn, authorizationToken: `Basic ${encoded}` } as any);
    expect(res.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('allows valid credentials', async () => {
    const encoded = Buffer.from(`${USER}:TEST_PASSWORD`).toString('base64');
    const res = await basicAuthorizer({ type: 'TOKEN', methodArn, authorizationToken: `Basic ${encoded}` } as any);
    expect(res.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(res.principalId).toBe(USER);
  });
});

