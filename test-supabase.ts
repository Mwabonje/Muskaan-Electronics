import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey = "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const lpoData = {
    items: [
      {
        productId: 1,
        name: "Test Item",
        quantity: 1,
        price: 100,
        unitCost: 100,
        subtotal: 100,
      }
    ],
    totalAmount: 100,
    supplierName: "Test Supplier",
    date: new Date().toISOString(),
    status: "Pending",
    notes: "test notes",
    expectedDeliveryDate: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("purchaseOrders")
    .insert(lpoData)
    .select("id")
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
