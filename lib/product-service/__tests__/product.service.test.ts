import { ProductService } from '../services/product.service';
import { Product } from '../products-data';

describe('ProductService', () => {
  let productService: ProductService;
  let mockProducts: Product[];

  beforeEach(() => {
    mockProducts = [
      {
        id: "test-id-1",
        title: "Test Product 1",
        description: "Test Description 1",
        price: 10,
        count: 5
      },
      {
        id: "test-id-2",
        title: "Test Product 2",
        description: "Test Description 2",
        price: 20,
        count: 3
      }
    ];
    productService = new ProductService(mockProducts);
  });

  describe('getAllProducts', () => {
    it('should return all products', () => {
      const result = productService.getAllProducts();
      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no products exist', () => {
      const emptyProductService = new ProductService([]);
      const result = emptyProductService.getAllProducts();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getProductById', () => {
    it('should return product when valid ID is provided', () => {
      const result = productService.getProductById('test-id-1');
      expect(result).toEqual(mockProducts[0]);
    });

    it('should return null when product is not found', () => {
      const result = productService.getProductById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return null when empty string is provided', () => {
      const result = productService.getProductById('');
      expect(result).toBeNull();
    });

    it('should return null when null is provided', () => {
      const result = productService.getProductById(null as any);
      expect(result).toBeNull();
    });

    it('should return null when undefined is provided', () => {
      const result = productService.getProductById(undefined as any);
      expect(result).toBeNull();
    });
  });

  describe('validateProductId', () => {
    it('should return true for valid product ID', () => {
      expect(productService.validateProductId('test-id-1')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(productService.validateProductId('')).toBe(false);
    });

    it('should return false for whitespace only', () => {
      expect(productService.validateProductId('   ')).toBe(false);
    });

    it('should return false for null', () => {
      expect(productService.validateProductId(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(productService.validateProductId(undefined as any)).toBe(false);
    });
  });
});
