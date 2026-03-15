import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey = "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const returnData = {
    items: [
      {
        productId: 1,
        name: "Test Item",
        quantity: 1,
        price: 100,
        subtotal: 100,
      }
    ],
    totalRefund: 100,
    customerName: "Test Customer",
    reason: "test reason",
    condition: "Good",
    date: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("returns")
    .insert(returnData)
    .select("id")
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
