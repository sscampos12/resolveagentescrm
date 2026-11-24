import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserBody {
  email: string;
  password: string;
  display_name: string;
  role?: "client" | "admin";
  plan_id?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use the caller's JWT to verify they are an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if caller is admin
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem criar usuarios" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse body
    const body: CreateUserBody = await req.json();
    const { email, password, display_name, role, plan_id } = body;

    if (!email || !password || !display_name) {
      return new Response(
        JSON.stringify({ error: "Email, senha e nome sao obrigatorios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create user with service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });

    if (createError || !newUser) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Erro ao criar usuario" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update the profile created by the trigger with role and plan
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        role: role ?? "client",
        plan_id: plan_id ?? null,
        subscription_status: plan_id ? "active" : "pending",
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Usuario criado, mas erro ao definir plano: " + updateError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
