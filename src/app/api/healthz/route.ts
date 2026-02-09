import { createClientServer } from "@/lib/db/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClientServer();
    
    // Minimal DB query to keep Supabase alive
    const { data, error } = await supabase
      .from("audit_log")
      .select("count")
      .limit(1);
    
    if (error) throw error;
    
    // Log keepalive ping
    await supabase.from("audit_log").insert({
      table_name: "healthz",
      action: "keepalive_ping",
      source: "keepalive",
      user_id: null,
    });
    
    return NextResponse.json(
      { 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        db: "connected"
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}
