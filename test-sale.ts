import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey = "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const saleData = {
    items: [
      {
        productId: 1,
        name: "Test Item",
        quantity: 1,
        price: 100,
        subtotal: 100,
      }
    ],
    totalAmount: 100,
    paymentMethod: "Cash",
    date: new Date().toISOString(),
    customerName: "Test Customer",
    notes: "test notes",
  };

  const { data, error } = await supabase
    .from("sales")
    .insert(saleData)
    .select("id")
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
