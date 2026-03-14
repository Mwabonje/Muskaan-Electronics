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
  last_login: string;
}

export interface Product {
  id?: number;
  name: string;
  brand: string;
  category: string;
  cost_price: string | number;
  selling_price: string | number;
  stock: number;
  min_stock?: number;
  status: string;
  image?: string;
}

export interface SaleItem {
  product_id: number;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  total_amount: number;
  subtotal: number;
  discount: number;
  payment_method: string;
  date: string;
  customer_name?: string;
  notes?: string;
  transaction_code?: string;
}

export interface Quote {
  id?: number;
  items: SaleItem[];
  total_amount: number;
  date: string;
  customer_name?: string;
  notes?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
}

export interface PurchaseOrder {
  id?: number;
  items: SaleItem[];
  total_amount: number;
  supplier_name: string;
  date: string;
  expected_delivery_date?: string;
  status: 'Pending' | 'Approved' | 'Delivered' | 'Cancelled' | 'Rejected';
  notes?: string;
  rejection_reason?: string;
}

export type LPO = PurchaseOrder;

export interface Delivery {
  id?: number;
  purchase_order_id?: number;
  purchase_order_ids?: number[];
  items: SaleItem[];
  supplier_name: string;
  date: string;
  received_by: string;
  driver_name?: string;
  plate_number?: string;
  received_time?: string;
  notes?: string;
}

export interface Return {
  id?: number;
  original_sale_id?: number;
  items: SaleItem[];
  total_refund: number;
  customer_name: string;
  date: string;
  reason: string;
  condition: 'Good' | 'Damaged';
}

export type CustomerReturn = Return;

export interface StockHistory {
  id?: number;
  product_id: number;
  change_type: 'Addition' | 'Deduction' | 'Adjustment' | 'Sale' | 'Return';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  date: string;
  reason?: string;
  user_id?: number;
}

export interface Message {
  id?: number;
  sender_id: number;
  sender_name: string;
  sender_role: Role;
  receiver_id: number | 'all_managers' | 'super_admin';
  subject: string;
  content: string;
  date: string;
  read: boolean;
  type: 'system' | 'user';
}

export interface Activity {
  id?: number;
  user_id: number;
  user_name: string;
  user_role: Role;
  type: 'Sale' | 'Quote' | 'LPO Created' | 'LPO Approved' | 'LPO Rejected' | 'Delivery' | 'Return' | 'Stock Adjustment';
  description: string;
  date: string;
  reference_id?: number;
}

const db = new Dexie('MuskaanDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  products: EntityTable<Product, 'id'>;
  sales: EntityTable<Sale, 'id'>;
  quotes: EntityTable<Quote, 'id'>;
  purchase_orders: EntityTable<PurchaseOrder, 'id'>;
  deliveries: EntityTable<Delivery, 'id'>;
  returns: EntityTable<Return, 'id'>;
  stock_history: EntityTable<StockHistory, 'id'>;
  messages: EntityTable<Message, 'id'>;
  activities: EntityTable<Activity, 'id'>;
};

// Schema declaration
db.version(8).stores({
  users: '++id, name, email, role, status',
  products: '++id, name, brand, category, status',
  sales: '++id, date, customer_name, payment_method',
  quotes: '++id, date, customer_name, status',
  purchase_orders: '++id, date, supplier_name, status',
  deliveries: '++id, date, supplier_name, purchase_order_id',
  returns: '++id, date, customer_name, original_sale_id',
  stock_history: '++id, product_id, date, change_type',
  messages: '++id, sender_id, receiver_id, date, read, type',
  activities: '++id, user_id, user_role, date, type'
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
