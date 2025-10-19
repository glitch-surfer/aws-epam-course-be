interface AuthorizerEvent {
  type: string;
  authorizationToken?: string;
  methodArn: string;
}

interface PolicyStatement {
  Action: string;
  Effect: 'Allow' | 'Deny';
  Resource: string | string[];
}

interface AuthResponse {
  principalId: string;
  policyDocument: {
    Version: string;
    Statement: PolicyStatement[];
  };
  context?: Record<string, any>;
}

const buildPolicy = (principalId: string, effect: 'Allow' | 'Deny', resource: string, context?: Record<string, any>): AuthResponse => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  },
  context,
});

export const main = async (event: AuthorizerEvent): Promise<AuthResponse> => {
  console.log('basicAuthorizer event:', JSON.stringify(event));
  try {
    if (!event.authorizationToken) {
      console.warn('No authorization token provided');
      throw new Error('Unauthorized'); // Triggers 401
    }

    const token = event.authorizationToken;
    const [scheme, encoded] = token.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) {
      console.warn('Malformed authorization token');
      return buildPolicy('unknown', 'Deny', event.methodArn, { reason: 'Malformed token' }); // 403
    }

    let decoded: string;
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    } catch (e) {
      console.warn('Failed to base64 decode token');
      return buildPolicy('unknown', 'Deny', event.methodArn, { reason: 'Bad base64' });
    }

    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      console.warn('Decoded token missing colon separator');
      return buildPolicy('unknown', 'Deny', event.methodArn, { reason: 'Invalid credentials format' });
    }

    const username = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);

    if (!username || !password) {
      console.warn('Empty username or password');
      return buildPolicy('unknown', 'Deny', event.methodArn, { reason: 'Empty username or password' });
    }

    const expectedPassword = process.env[username];
    if (!expectedPassword || expectedPassword !== password) {
      console.warn(`Invalid credentials for user: ${username}`);
      return buildPolicy(username || 'unknown', 'Deny', event.methodArn, { reason: 'Invalid credentials' });
    }

    console.log(`Authorization success for user: ${username}`);
    return buildPolicy(username, 'Allow', event.methodArn, { authorizedUser: username });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      // Re-throw to force API Gateway to respond with 401
      throw error;
    }
    console.error('Unexpected error in basicAuthorizer', error);
    return buildPolicy('unknown', 'Deny', event.methodArn, { reason: 'Internal error' });
  }
};

