import Dexie from "dexie";
import { supabase } from "../supabase";

export const localDb = new Dexie("muskaanOfflineDb");

localDb.version(1).stores({
  users: "++id, email",
  products: "++id, name, brand, category",
  sales: "++id, date",
  quotes: "++id, date",
  purchaseOrders: "++id, date",
  deliveries: "++id, date",
  returns: "++id, date",
  stockHistory: "++id, productId, date",
  messages: "++id, senderId, receiverId, date",
  syncQueue: "++id, tableName, operation, status"
});

let isSyncing = false;

export async function processSyncQueue() {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;
  try {
    const queueTable = localDb.table("syncQueue");
    const items = await queueTable.toArray();
    for (const item of items) {
      try {
        if (item.operation === "add") {
          await supabase.from(item.tableName).insert(item.payload);
        } else if (item.operation === "update") {
          await supabase.from(item.tableName).update(item.payload).eq("id", item.recordId);
        } else if (item.operation === "delete") {
          await supabase.from(item.tableName).delete().eq("id", item.recordId);
        }
        await queueTable.delete(item.id);
      } catch (e) {
        console.error("Failed to sync item", item, e);
      }
    }
  } finally {
    isSyncing = false;
  }
}

window.addEventListener('online', () => {
    processSyncQueue();
});
