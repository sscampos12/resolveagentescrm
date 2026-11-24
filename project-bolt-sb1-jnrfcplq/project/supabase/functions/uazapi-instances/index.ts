import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UazapiInstance {
  name?: string;
  instanceName?: string;
  profileName?: string;
  profile?: string;
  status?: string;
  connectionStatus?: string;
  state?: string;
  phone?: string;
  number?: string;
  wuid?: string;
  jid?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
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

    // Load the user's UazAPI config
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: config, error: configError } = await adminClient
      .from("uazapi_config")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "Configuracao da UazAPI nao encontrada. Configure primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (config.mode === "single") {
      return new Response(
        JSON.stringify({
          mode: "single",
          instances: [],
          message: "Modo instancia unica — nenhuma lista de instancias disponivel.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin mode — fetch all instances from UazAPI
    const baseUrl = config.base_url.replace(/\/$/, "");
    const instancesResponse = await fetch(`${baseUrl}/instance/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        admintoken: config.api_token,
      },
    });

    if (!instancesResponse.ok) {
      const errText = await instancesResponse.text();
      return new Response(
        JSON.stringify({ error: `Erro da UazAPI: ${instancesResponse.status} ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawInstances = await instancesResponse.json();
    const instanceList: UazapiInstance[] = Array.isArray(rawInstances)
      ? rawInstances
      : rawInstances?.instances ?? rawInstances?.data ?? [];

    const normalized = instanceList.map((inst: UazapiInstance) => ({
      name: inst.name ?? inst.instanceName ?? inst.profileName ?? inst.profile ?? "—",
      status: inst.status ?? inst.connectionStatus ?? inst.state ?? "unknown",
      phone: inst.phone ?? inst.number ?? inst.wuid ?? inst.jid ?? "",
    }));

    return new Response(
      JSON.stringify({ mode: "admin", instances: normalized }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
