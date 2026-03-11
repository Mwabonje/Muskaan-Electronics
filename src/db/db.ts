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
  cost: string;
  selling: string;
  stock: number;
  status: string;
  image?: string;
}

const db = new Dexie('MuskaanDB') as Dexie & {
  users: EntityTable<User, 'id'>;
  products: EntityTable<Product, 'id'>;
};

// Schema declaration
db.version(2).stores({
  users: '++id, name, email, role, status',
  products: '++id, name, brand, category, status'
});

db.version(3).stores({
  users: '++id, name, email, role, status',
  products: '++id, name, brand, category, status'
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
    { name: 'iPhone 15 Pro Max', brand: 'Apple', category: 'Smartphones', cost: '$999.00', selling: '$1,199.00', stock: 45, status: 'In Stock', image: 'https://picsum.photos/seed/iphone/200' },
    { name: 'Samsung QN90C Neo QLED', brand: 'Samsung', category: 'Televisions', cost: '$1,200.00', selling: '$1,599.00', stock: 8, status: 'Low Stock', image: 'https://picsum.photos/seed/tv/200' },
    { name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Audio', cost: '$250.00', selling: '$349.99', stock: 0, status: 'Out of Stock', image: 'https://picsum.photos/seed/headphones/200' },
    { name: 'MacBook Air M3 15"', brand: 'Apple', category: 'Laptops', cost: '$1,050.00', selling: '$1,299.00', stock: 22, status: 'In Stock', image: 'https://picsum.photos/seed/macbook/200' },
    { name: 'Dell XPS 13', brand: 'Dell', category: 'Laptops', cost: '$850.00', selling: '$999.00', stock: 5, status: 'Low Stock', image: 'https://picsum.photos/seed/dell/200' },
  ]);
});

export { db };
