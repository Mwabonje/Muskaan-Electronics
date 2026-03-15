import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey = "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const deliveryData = {
    items: [
      {
        productId: 1,
        name: "Test Item",
        quantity: 1,
        price: 0,
        subtotal: 0,
      }
    ],
    supplierName: "Test Supplier",
    receivedBy: "Test Receiver",
    date: new Date().toISOString(),
    notes: "test notes",
  };

  const { data, error } = await supabase
    .from("deliveries")
    .insert(deliveryData)
    .select("id")
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
