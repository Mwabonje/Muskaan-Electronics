import Dexie, { type EntityTable } from 'dexie';

export type Role = 'Super Admin' | 'Manager' | 'Cashier';
export type Status = 'Active' | 'Inactive';

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: Role;
  status: Status;
  lastLogin: string;
}

export interface Product {
  id?: number;
  name: string;
  brand: string;
  category: string;
  cost: string | number;
  selling: string | number;
  stock: number;
  minStock?: number;
  status: string;
  image?: string;
}

export interface SaleItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  date: string;
  customerName?: string;
  notes?: string;
}

export interface Quote {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  date: string;
  customerName?: string;
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

export interface PurchaseOrder {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  supplierName: string;
  date: string;
  expectedDeliveryDate?: string;
  status: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled';
  notes?: string;
}

export type LPO = PurchaseOrder;

export interface Delivery {
  id?: number;
  purchaseOrderId?: number;
  purchaseOrderIds?: number[];
  items: SaleItem[];
  supplierName: string;
  date: string;
  receivedBy: string;
  notes?: string;
}

export interface Return {
  id?: number;
  originalSaleId?: number;
  items: SaleItem[];
  totalRefund: number;
  customerName: string;
  date: string;
  reason: string;
  condition: 'Good' | 'Damaged';
}

export type CustomerReturn = Return;

export interface StockHistory {
  id?: number;
  productId: number;
  changeType: 'Addition' | 'Deduction' | 'Adjustment' | 'Sale' | 'Return';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  date: string;
  reason?: string;
  userId?: number;
}

export interface Message {
  id?: number;
  senderId: number;
  senderName: string;
  senderRole: Role;
  receiverId: number | 'all_managers' | 'super_admin';
  subject: string;
  content: string;
  date: string;
  read: boolean;
  type: 'system' | 'user';
}

const db = new Dexie('MuskaanDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  products: EntityTable<Product, 'id'>;
  sales: EntityTable<Sale, 'id'>;
  quotes: EntityTable<Quote, 'id'>;
  purchaseOrders: EntityTable<PurchaseOrder, 'id'>;
  deliveries: EntityTable<Delivery, 'id'>;
  returns: EntityTable<Return, 'id'>;
  stockHistory: EntityTable<StockHistory, 'id'>;
  messages: EntityTable<Message, 'id'>;
};

// Schema declaration
db.version(6).stores({
  users: '++id, name, email, role, status',
  products: '++id, name, brand, category, status',
  sales: '++id, date, customerName, paymentMethod',
  quotes: '++id, date, customerName, status',
  purchaseOrders: '++id, date, supplierName, status',
  deliveries: '++id, date, supplierName, purchaseOrderId',
  returns: '++id, date, customerName, saleId',
  stockHistory: '++id, productId, date, changeType',
  messages: '++id, senderId, receiverId, date, read, type'
}).upgrade(tx => {
  return tx.table('users').toCollection().modify(user => {
    if (!user.password) {
      user.password = user.email === 'admin@muskaan.com' ? 'admin123' : 'password123';
    }
  });
});

// Seed initial data if empty
db.on('populate', () => {
  db.users.bulkAdd([
    { name: 'Admin User', email: 'admin@muskaan.com', password: 'admin123', role: 'Super Admin', status: 'Active', lastLogin: 'Just now' },
    { name: 'Rahul Sharma', email: 'rahul@muskaan.com', password: 'password123', role: 'Manager', status: 'Active', lastLogin: '2 hours ago' },
    { name: 'Priya Mehta', email: 'priya@muskaan.com', password: 'password123', role: 'Cashier', status: 'Active', lastLogin: 'Yesterday' },
    { name: 'Amit Kumar', email: 'amit@muskaan.com', password: 'password123', role: 'Cashier', status: 'Inactive', lastLogin: '5 days ago' },
  ]);
  
  db.products.bulkAdd([
    { name: 'iPhone 15 Pro Max', brand: 'Apple', category: 'Smartphones', cost: 'Ksh 999.00', selling: 'Ksh 1,199.00', stock: 45, status: 'In Stock', image: 'https://picsum.photos/seed/iphone/200' },
    { name: 'Samsung QN90C Neo QLED', brand: 'Samsung', category: 'Televisions', cost: 'Ksh 1,200.00', selling: 'Ksh 1,599.00', stock: 8, status: 'Low Stock', image: 'https://picsum.photos/seed/tv/200' },
    { name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Audio', cost: 'Ksh 250.00', selling: 'Ksh 349.99', stock: 0, status: 'Out of Stock', image: 'https://picsum.photos/seed/headphones/200' },
    { name: 'MacBook Air M3 15"', brand: 'Apple', category: 'Laptops', cost: 'Ksh 1,050.00', selling: 'Ksh 1,299.00', stock: 22, status: 'In Stock', image: 'https://picsum.photos/seed/macbook/200' },
    { name: 'Dell XPS 13', brand: 'Dell', category: 'Laptops', cost: 'Ksh 850.00', selling: 'Ksh 999.00', stock: 5, status: 'Low Stock', image: 'https://picsum.photos/seed/dell/200' },
  ]);
});

export { db };
