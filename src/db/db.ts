import { supabase } from "../supabase";

export type Role = "Super Admin" | "Admin" | "Manager" | "Cashier";
export type Status = "Active" | "Inactive";

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
  unitCost?: number | string; // Added for ViewLPOModal
  refundAmount?: number | string; // Added for ViewReturnModal
  condition?: "Good" | "Damaged"; // Added for ViewReturnModal
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  date: string;
  customerName?: string;
  notes?: string;
  subtotal?: number; // Added for ViewSaleModal
  discount?: number; // Added for ViewSaleModal
  userId?: number;
  userName?: string;
}

export interface Quote {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  date: string;
  customerName?: string;
  notes?: string;
  status: "Pending" | "Accepted" | "Rejected";
  isVisibleToCashier?: boolean;
  userId?: number;
  userName?: string;
}

export interface PurchaseOrder {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  supplierName: string;
  date: string;
  expectedDeliveryDate?: string;
  status: "Pending" | "Approved" | "Rejected" | "Delivered" | "Cancelled";
  notes?: string;
  userId?: number;
  userName?: string;
}

export type LPO = PurchaseOrder; // Alias for PurchaseOrders.tsx

export interface Delivery {
  id?: number;
  purchaseOrderId?: number;
  lpoNumber?: string; // Added for Deliveries.tsx
  items: SaleItem[];
  supplierName: string;
  date: string;
  receivedBy: string;
  notes?: string;
  userId?: number;
  userName?: string;
}

export interface Return {
  id?: number;
  saleId?: number;
  originalSaleId?: number; // Added for CustomerReturns.tsx
  items: SaleItem[];
  totalRefund: number;
  customerName: string;
  date: string;
  reason: string;
  condition: "Good" | "Damaged";
  userId?: number;
  userName?: string;
}

export type CustomerReturn = Return; // Alias for CustomerReturns.tsx

export interface StockHistory {
  id?: number;
  productId: number;
  changeType: "Addition" | "Deduction" | "Adjustment" | "Sale" | "Return";
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
  receiverId: number | string;
  subject: string;
  content: string;
  date: string;
  read: boolean;
  type: "system" | "user";
}

// Simple event emitter to trigger re-renders for useLiveQuery
const listeners = new Set<() => void>();
const triggerUpdate = () => {
  listeners.forEach((listener) => listener());
};

export function subscribeToDb(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

class TableAdapter<T extends { id?: number }> {
  tableName: string;
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async toArray(): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error(`Error fetching ${this.tableName}:`, error);
      return [];
    }
    return data as T[];
  }

  async add(item: T): Promise<number> {
    const { id, ...rest } = item;
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(rest)
      .select("id")
      .single();
    if (error) throw error;
    triggerUpdate();
    return data.id;
  }

  async bulkAdd(items: T[]): Promise<void> {
    const itemsWithoutId = items.map(({ id, ...rest }) => rest);
    const { error } = await supabase
      .from(this.tableName)
      .insert(itemsWithoutId);
    if (error) throw error;
    triggerUpdate();
  }

  async update(id: number, changes: Partial<T>): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update(changes)
      .eq("id", id);
    if (error) throw error;
    triggerUpdate();
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq("id", id);
    if (error) throw error;
    triggerUpdate();
  }

  async count(): Promise<number> {
    const { count, error } = await supabase
      .from(this.tableName)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count || 0;
  }

  async get(id: number): Promise<T | undefined> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .single();
    if (error) return undefined;
    return data as T;
  }

  reverse() {
    return {
      toArray: async () => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select("*")
          .order("id", { ascending: false });
        if (error) throw error;
        return data as T[];
      },
      sortBy: async (field: string) => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select("*")
          .order(field, { ascending: false });
        if (error) throw error;
        return data as T[];
      },
    };
  }

  where(field: string) {
    return {
      equals: (value: any) => ({
        count: async () => {
          const { count, error } = await supabase
            .from(this.tableName)
            .select("*", { count: "exact", head: true })
            .eq(field, value);
          if (error) throw error;
          return count || 0;
        },
        first: async () => {
          const { data, error } = await supabase
            .from(this.tableName)
            .select("*")
            .eq(field, value)
            .limit(1)
            .single();
          if (error) return undefined;
          return data as T;
        },
        reverse: () => ({
          sortBy: async (sortField: string) => {
            const { data, error } = await supabase
              .from(this.tableName)
              .select("*")
              .eq(field, value)
              .order(sortField, { ascending: false });
            if (error) throw error;
            return data as T[];
          },
        }),
      }),
      equalsIgnoreCase: (value: string) => ({
        first: async () => {
          const { data, error } = await supabase
            .from(this.tableName)
            .select("*")
            .ilike(field, value)
            .limit(1)
            .single();
          if (error) return undefined;
          return data as T;
        },
      }),
    };
  }

  filter(predicate: (item: T) => boolean) {
    return {
      toArray: async () => {
        const { data, error } = await supabase.from(this.tableName).select("*");
        if (error) throw error;
        return (data as T[]).filter(predicate);
      },
    };
  }
}

export const db = {
  users: new TableAdapter<User>("users"),
  products: new TableAdapter<Product>("products"),
  sales: new TableAdapter<Sale>("sales"),
  quotes: new TableAdapter<Quote>("quotes"),
  purchaseOrders: new TableAdapter<PurchaseOrder>("purchaseOrders"),
  lpos: new TableAdapter<PurchaseOrder>("purchaseOrders"), // Alias
  deliveries: new TableAdapter<Delivery>("deliveries"),
  returns: new TableAdapter<Return>("returns"),
  stockHistory: new TableAdapter<StockHistory>("stockHistory"),
  messages: new TableAdapter<Message>("messages"),
  on: (event: string, callback: () => void) => {
    // Mock populate event
    if (event === "populate") {
      // We don't auto-populate Supabase from client usually, but we can leave it empty
    }
  },
  version: (v: number) => ({
    stores: (s: any) => ({
      upgrade: (cb: any) => {},
    }),
  }),
};
