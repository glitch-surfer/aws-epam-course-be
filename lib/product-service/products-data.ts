export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
}

export const products: Product[] = [
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa",
    title: "ProductOne",
    description: "Short Product Description1",
    price: 24,
    count: 5
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80ab",
    title: "ProductNew",
    description: "Short Product Description3",
    price: 10,
    count: 3
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80ac",
    title: "ProductTop",
    description: "Short Product Description2",
    price: 15,
    count: 7
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80ad",
    title: "ProductTitle",
    description: "Short Product Description7",
    price: 50,
    count: 2
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80ae",
    title: "Product",
    description: "Short Product Description2",
    price: 23,
    count: 8
  },
  {
    id: "7567ec4b-b10c-48c5-9345-fc73c48a80af",
    title: "ProductTest",
    description: "Short Product Description4",
    price: 15,
    count: 6
  }
];
