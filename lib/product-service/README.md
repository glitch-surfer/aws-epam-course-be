# Product Service

This is a Product Service implementation using AWS CDK with Lambda functions and API Gateway.

## Architecture

The Product Service consists of:
- **ProductServiceStack**: CDK Stack that defines the infrastructure
- **API Gateway**: REST API with CORS enabled
- **Lambda Functions**:
  - `getProductsList`: Returns all products
  - `getProductsById`: Returns a specific product by ID

## API Endpoints

### GET /products
Returns a list of all products.

**Response:**
```json
[
  {
    "id": "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    "title": "ProductOne",
    "description": "Short Product Description1",
    "price": 24,
    "count": 5
  },
  ...
]
```

### GET /products/{productId}
Returns a specific product by ID.

**Parameters:**
- `productId` (path parameter): The UUID of the product

**Response (Success):**
```json
{
  "id": "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
  "title": "ProductOne",
  "description": "Short Product Description1",
  "price": 24,
  "count": 5
}
```

**Response (Product Not Found):**
```json
{
  "message": "Product not found"
}
```

**Response (Bad Request):**
```json
{
  "message": "Product ID is required"
}
```

## Deployment

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Bootstrap CDK (if first time):
```bash
npx cdk bootstrap
```

4. Deploy the stack:
```bash
npx cdk deploy ProductServiceStack
```

5. After deployment, you'll get the API Gateway URL in the output. Use this URL to test the endpoints.

## Testing

You can test the endpoints using curl or any HTTP client:

```bash
# Get all products
curl https://your-api-id.execute-api.region.amazonaws.com/prod/products

# Get specific product
curl https://your-api-id.execute-api.region.amazonaws.com/prod/products/7567ec4b-b10c-48c5-9345-fc73c48a80aa
```

## File Structure

```
lib/product-service/
├── product-service-stack.ts    # CDK Stack definition
├── products-data.ts           # Mock product data
├── getProductsList.ts         # Lambda handler for GET /products
└── getProductsById.ts         # Lambda handler for GET /products/{id}
```
