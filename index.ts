// Supabase Edge Function. Secret keys stay here, never in the browser.
// Deploy: supabase functions deploy create-checkout
// Secrets: supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx SITE_URL=https://yoursite.com
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { order_id } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: items, error } = await admin
      .from("order_items").select("quantity, products(name, price)").eq("order_id", order_id);
    if (error || !items?.length) throw new Error("Order not found");

    const site = Deno.env.get("SITE_URL")!;
    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(Deno.env.get("PAYMONGO_SECRET_KEY")! + ":"),
      },
      body: JSON.stringify({ data: { attributes: {
        line_items: items.map((i: any) => ({
          currency: "PHP", name: i.products.name, quantity: i.quantity,
          amount: Math.round(i.products.price * 100), // centavos
        })),
        payment_method_types: ["gcash", "paymaya", "card"],
        description: "Wagtail order " + order_id,
        reference_number: order_id,
        success_url: site + "/index.html?paid=" + order_id,
        cancel_url: site + "/index.html",
      } } }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.errors?.[0]?.detail || "Payment provider error");

    await admin.from("orders").update({ payment_ref: json.data.id }).eq("id", order_id);
    return new Response(JSON.stringify({ checkout_url: json.data.attributes.checkout_url }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
