import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey = "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const quoteData = {
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
    date: new Date().toISOString(),
    customerName: "Test Customer",
    notes: "test notes",
    status: "Pending",
  };

  const { data, error } = await supabase
    .from("quotes")
    .insert(quoteData)
    .select("id")
    .single();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

test();
