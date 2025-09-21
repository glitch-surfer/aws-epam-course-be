import { Product } from './products-data';

export class ProductService {
  constructor(private products: Product[]) {}

  getAllProducts(): Product[] {
    return this.products;
  }

  getProductById(productId: string): Product | null {
    if (!productId) {
      return null;
    }

    const product = this.products.find(p => p.id === productId);
    return product || null;
  }

  validateProductId(productId: string): boolean {
    return Boolean(productId && productId.trim().length > 0);
  }
}
