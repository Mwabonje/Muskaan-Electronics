import { supabase } from "../supabase";
import { localDb, processSyncQueue } from "./offlineSync";

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
  unitCost?: number | string;
  refundAmount?: number | string;
  condition?: "Good" | "Damaged";
}

export interface Sale {
  id?: number;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  date: string;
  customerName?: string;
  notes?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
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

export type LPO = PurchaseOrder;

export interface Delivery {
  id?: number;
  purchaseOrderId?: number;
  lpoNumber?: string;
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
  originalSaleId?: number;
  items: SaleItem[];
  totalRefund: number;
  customerName: string;
  date: string;
  reason: string;
  condition: "Good" | "Damaged";
  userId?: number;
  userName?: string;
}

export type CustomerReturn = Return;

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
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select("*")
          .order("id", { ascending: true });
        if (!error && data) {
          await localDb.table(this.tableName).clear();
          await localDb.table(this.tableName).bulkPut(data);
          processSyncQueue();
          return data as T[];
        }
      } catch (e) {}
    }
    const items = await localDb.table(this.tableName).toArray();
    return items.sort((a, b) => (a.id || 0) - (b.id || 0)) as T[];
  }

  async add(item: T): Promise<number> {
    const { id, ...rest } = item;
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .insert(rest)
          .select("id")
          .single();
        if (!error && data) {
          await localDb.table(this.tableName).put({ ...item, id: data.id });
          triggerUpdate();
          processSyncQueue();
          return data.id;
        }
      } catch (e) {}
    }
    
    const tempId = -Math.floor(Math.random() * 1000000);
    const localItem = { ...item, id: tempId };
    await localDb.table(this.tableName).put(localItem);
    await localDb.table("syncQueue").add({
      tableName: this.tableName,
      operation: "add",
      payload: rest,
      recordId: tempId
    });
    triggerUpdate();
    return tempId;
  }

  async bulkAdd(items: T[]): Promise<void> {
    const itemsWithoutId = items.map(({ id, ...rest }) => rest);
    if (navigator.onLine) {
      try {
        const { error, data } = await supabase
          .from(this.tableName)
          .insert(itemsWithoutId)
          .select();
        if (!error && data) {
          await localDb.table(this.tableName).bulkPut(data);
          triggerUpdate();
          processSyncQueue();
          return;
        }
      } catch (e) {}
    }
    for (const item of items) {
      await this.add(item);
    }
  }

  async update(id: number, changes: Partial<T>): Promise<void> {
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from(this.tableName)
          .update(changes)
          .eq("id", id);
        if (!error) {
          const item = await localDb.table(this.tableName).get(id);
          if (item) await localDb.table(this.tableName).put({ ...item, ...changes });
          triggerUpdate();
          processSyncQueue();
          return;
        }
      } catch (e) {}
    }
    const item = await localDb.table(this.tableName).get(id);
    if (item) await localDb.table(this.tableName).put({ ...item, ...changes });
    await localDb.table("syncQueue").add({
      tableName: this.tableName,
      operation: "update",
      payload: changes,
      recordId: id
    });
    triggerUpdate();
  }

  async delete(id: number): Promise<void> {
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from(this.tableName).delete().eq("id", id);
        if (!error) {
          await localDb.table(this.tableName).delete(id);
          triggerUpdate();
          processSyncQueue();
          return;
        }
      } catch (e) {}
    }
    await localDb.table(this.tableName).delete(id);
    await localDb.table("syncQueue").add({
      tableName: this.tableName,
      operation: "delete",
      payload: { id },
      recordId: id
    });
    triggerUpdate();
  }

  async clear(): Promise<void> {
    if (navigator.onLine) {
      try {
        const { error } = await supabase.from(this.tableName).delete().neq("id", 0);
        if (!error) {
          await localDb.table(this.tableName).clear();
          triggerUpdate();
          return;
        }
      } catch (e) {}
    }
    await localDb.table(this.tableName).clear();
    triggerUpdate();
  }

  async count(): Promise<number> {
    if (navigator.onLine) {
      try {
        const { count, error } = await supabase
          .from(this.tableName)
          .select("*", { count: "exact", head: true });
        if (!error) return count || 0;
      } catch (e) {}
    }
    return await localDb.table(this.tableName).count();
  }

  async get(id: number): Promise<T | undefined> {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) {
          await localDb.table(this.tableName).put(data);
          return data as T;
        }
      } catch (e) {}
    }
    return await localDb.table(this.tableName).get(id);
  }

  reverse() {
    return {
      toArray: async () => {
        if (navigator.onLine) {
          try {
            const { data, error } = await supabase
              .from(this.tableName)
              .select("*")
              .order("id", { ascending: false });
            if (!error && data) return data as T[];
          } catch (e) {}
        }
        const items = await localDb.table(this.tableName).toArray();
        return items.sort((a, b) => (b.id || 0) - (a.id || 0)) as T[];
      },
      sortBy: async (field: string) => {
        if (navigator.onLine) {
          try {
            const { data, error } = await supabase
              .from(this.tableName)
              .select("*")
              .order(field, { ascending: false });
            if (!error && data) return data as T[];
          } catch (e) {}
        }
        const items = await localDb.table(this.tableName).toArray();
        return items.sort((a, b) => {
          if (a[field as keyof T] < b[field as keyof T]) return 1;
          if (a[field as keyof T] > b[field as keyof T]) return -1;
          return 0;
        }) as T[];
      },
    };
  }

  where(field: string) {
    return {
      equals: (value: any) => ({
        count: async () => {
          if (navigator.onLine) {
            try {
              const { count, error } = await supabase
                .from(this.tableName)
                .select("*", { count: "exact", head: true })
                .eq(field, value);
              if (!error) return count || 0;
            } catch (e) {}
          }
          const items = await localDb.table(this.tableName).where(field as string).equals(value).toArray();
          return items.length;
        },
        first: async () => {
          if (navigator.onLine) {
            try {
              const { data, error } = await supabase
                .from(this.tableName)
                .select("*")
                .eq(field, value)
                .limit(1)
                .single();
              if (!error && data) return data as T;
            } catch (e) {}
          }
          const items = await localDb.table(this.tableName).where(field as string).equals(value).toArray();
          return items[0] as T | undefined;
        },
        reverse: () => ({
          sortBy: async (sortField: string) => {
            if (navigator.onLine) {
              try {
                const { data, error } = await supabase
                  .from(this.tableName)
                  .select("*")
                  .eq(field, value)
                  .order(sortField, { ascending: false });
                if (!error && data) return data as T[];
              } catch (e) {}
            }
            const items = await localDb.table(this.tableName).where(field as string).equals(value).toArray();
            return items.sort((a, b) => {
              if (a[sortField as keyof T] < b[sortField as keyof T]) return 1;
              if (a[sortField as keyof T] > b[sortField as keyof T]) return -1;
              return 0;
            }) as T[];
          },
        }),
      }),
      equalsIgnoreCase: (value: string) => ({
        first: async () => {
          if (navigator.onLine) {
            try {
              const { data, error } = await supabase
                .from(this.tableName)
                .select("*")
                .ilike(field, value)
                .limit(1)
                .single();
              if (!error && data) return data as T;
            } catch (e) {}
          }
          const items = await localDb.table(this.tableName).toArray();
          return items.find(i => String(i[field as keyof T]).toLowerCase() === value.toLowerCase()) as T | undefined;
        },
      }),
    };
  }

  filter(predicate: (item: T) => boolean) {
    return {
      toArray: async () => {
        if (navigator.onLine) {
          try {
            const { data, error } = await supabase.from(this.tableName).select("*");
            if (!error && data) return (data as T[]).filter(predicate);
          } catch (e) {}
        }
        const items = await localDb.table(this.tableName).toArray();
        return items.filter(predicate) as T[];
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
