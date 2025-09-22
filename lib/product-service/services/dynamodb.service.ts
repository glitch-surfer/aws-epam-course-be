import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {BatchWriteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand} from '@aws-sdk/lib-dynamodb';

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
}

export interface Stock {
    product_id: string;
    count: number;
}

export interface ProductWithStock extends Product {
    count: number;
}

export class DynamoDBService {
    private dynamoDbClient: DynamoDBDocumentClient;
    private readonly productsTableName: string;
    private readonly stockTableName: string;

    constructor() {
        const client = new DynamoDBClient({region: process.env.AWS_REGION});
        this.dynamoDbClient = DynamoDBDocumentClient.from(client);
        this.productsTableName = process.env.PRODUCTS_TABLE_NAME as string;
        this.stockTableName = process.env.STOCK_TABLE_NAME as string;
    }

    async getAllProductsWithStock(): Promise<ProductWithStock[]> {
        try {
            console.log('Fetching all products from DynamoDB');

            const productsResult = await this.dynamoDbClient.send(new ScanCommand({
                TableName: this.productsTableName,
            }));

            const stockResult = await this.dynamoDbClient.send(new ScanCommand({
                TableName: this.stockTableName,
            }));

            const products = productsResult.Items as Product[];
            const stocks = stockResult.Items as Stock[];

            const stockMap = new Map<string, number>();
            stocks.forEach(stock => {
                stockMap.set(stock.product_id, stock.count);
            });

            const productsWithStock: ProductWithStock[] = products.map(product => ({
                ...product,
                count: stockMap.get(product.id) || 0,
            }));

            console.log(`Retrieved ${productsWithStock.length} products with stock`);
            return productsWithStock;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw new Error('Failed to fetch products from database');
        }
    }

    async getProductByIdWithStock(id: string): Promise<ProductWithStock | null> {
        try {
            console.log(`Fetching product with ID: ${id}`);

            const productResult = await this.dynamoDbClient.send(new GetCommand({
                TableName: this.productsTableName,
                Key: {id},
            }));

            if (!productResult.Item) {
                console.log(`Product with ID ${id} not found`);
                return null;
            }

            const product = productResult.Item as Product;

            const stockResult = await this.dynamoDbClient.send(new GetCommand({
                TableName: this.stockTableName,
                Key: {product_id: id},
            }));

            const stock = stockResult.Item as Stock;

            const productWithStock: ProductWithStock = {
                ...product,
                count: stock?.count || 0,
            };

            console.log(`Retrieved product: ${JSON.stringify(productWithStock)}`);
            return productWithStock;
        } catch (error) {
            console.error('Error fetching product:', error);
            throw new Error('Failed to fetch product from database');
        }
    }

    async createProduct(productData: Omit<ProductWithStock, 'id'>): Promise<ProductWithStock> {
        try {
            const id = (await import('uuid')).v4();
            console.log(`Creating product with ID: ${id}`);

            const product: Product = {
                id,
                title: productData.title,
                description: productData.description,
                price: productData.price,
            };

            const stock: Stock = {
                product_id: id,
                count: productData.count,
            };

            await this.dynamoDbClient.send(new PutCommand({
                TableName: this.productsTableName,
                Item: product,
            }));

            await this.dynamoDbClient.send(new PutCommand({
                TableName: this.stockTableName,
                Item: stock,
            }));

            const createdProduct: ProductWithStock = {
                ...product,
                count: stock.count,
            };

            console.log(`Created product: ${JSON.stringify(createdProduct)}`);
            return createdProduct;
        } catch (error) {
            console.error('Error creating product:', error);
            throw new Error('Failed to create product in database');
        }
    }

    async batchCreateProducts(products: Omit<ProductWithStock, 'id'>[]): Promise<void> {
        try {
            console.log(`Batch creating ${products.length} products`);
            const {v4: uuidV4} = (await import('uuid'));

            const productItems = products.map(product => ({
                PutRequest: {
                    Item: {
                        id: uuidV4(),
                        title: product.title,
                        description: product.description,
                        price: product.price,
                    },
                },
            }));

            const stockItems = productItems.map((item, index) => ({
                PutRequest: {
                    Item: {
                        product_id: item.PutRequest.Item.id,
                        count: products[index].count,
                    },
                },
            }));

            await this.dynamoDbClient.send(new BatchWriteCommand({
                RequestItems: {
                    [this.productsTableName]: productItems,
                },
            }));

            await this.dynamoDbClient.send(new BatchWriteCommand({
                RequestItems: {
                    [this.stockTableName]: stockItems,
                },
            }));

            console.log('Batch create completed successfully');
        } catch (error) {
            console.error('Error in batch create:', error);
            throw new Error('Failed to batch create products');
        }
    }
}

