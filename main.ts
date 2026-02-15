const keyDatabase: Record<string, {
  hwid: string | null;
  active: boolean;
  expiry: string | null;
}> = {
  "123": { hwid: null, active: true, expiry: null },
  "456": { hwid: null, active: true, expiry: "2025-12-31" },
  "789": { hwid: "HWID-FIXED-123", active: true, expiry: null }
};

function log(type: string, message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "alive",
          service: "API Validator",
          timestamp: new Date().toISOString(),
          endpoints: {
            validate: "POST /validate",
            health: "GET /health"
          }
        }),
        { status: 200, headers: corsHeaders }
      );
    }
  }

  if (req.method === "POST") {
    const url = new URL(req.url);
    
    if (url.pathname === "/validate" || url.pathname === "/") {
      try {
        const body = await req.json();
        const { key, hwid } = body;

        if (!key || !hwid) {
          log("ERROR", "Missing key or hwid");
          return new Response(
            JSON.stringify({
              valid: false,
              reason: "Key dan HWID harus diisi"
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        log("INFO", `Validation request - Key: ${key}, HWID: ${hwid.substring(0, 10)}...`);

        const keyData = keyDatabase[key];

        if (!keyData) {
          log("REJECT", `Key not found: ${key}`);
          return new Response(
            JSON.stringify({
              valid: false,
              reason: "Key tidak ditemukan"
            }),
            { status: 404, headers: corsHeaders }
          );
        }

        if (!keyData.active) {
          log("REJECT", `Key inactive: ${key}`);
          return new Response(
            JSON.stringify({
              valid: false,
              reason: "Key sudah tidak aktif"
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        if (keyData.expiry && new Date() > new Date(keyData.expiry)) {
          log("REJECT", `Key expired: ${key}`);
          keyDatabase[key].active = false;
          
          return new Response(
            JSON.stringify({
              valid: false,
              reason: "Key sudah expired"
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        if (keyData.hwid === null) {
          keyDatabase[key].hwid = hwid;
          log("BIND", `Key ${key} bound to HWID ${hwid.substring(0, 10)}...`);
          
          return new Response(
            JSON.stringify({
              valid: true,
              reason: "",
              message: "Key berhasil ditautkan ke HWID ini",
              hwid: hwid,
              firstActivation: true
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        if (keyData.hwid !== hwid) {
          log("REJECT", `HWID mismatch for key ${key}`);
          
          return new Response(
            JSON.stringify({
              valid: false,
              reason: "HWID tidak cocok. Key sudah tertaut ke perangkat lain"
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        log("SUCCESS", `Key ${key} validated successfully`);
        
        return new Response(
          JSON.stringify({
            valid: true,
            reason: "",
            message: "Key valid dan HWID cocok",
            expiryDate: keyData.expiry
          }),
          { status: 200, headers: corsHeaders }
        );

      } catch (error) {
        log("ERROR", `JSON parse error: ${error}`);
        
        return new Response(
          JSON.stringify({
            valid: false,
            reason: "Invalid request format. Use JSON with 'key' and 'hwid'"
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: "Not Found",
      message: "Use POST /validate with JSON body"
    }),
    { status: 404, headers: corsHeaders }
  );
});
```

4. Scroll ke bawah → Klik **"Commit new file"**

---

### **Step 3: Deploy ke Deno Deploy**

1. Buka https://dash.deno.com/ di browser HP
2. Klik **"Sign in with GitHub"**
3. Authorize Deno Deploy
4. Klik **"New Project"**
5. Klik **"Deploy from GitHub repository"**
6. Pilih repository: **`api-validator`**
7. **Branch:** `main`
8. **Entry Point:** `main.ts`
9. Klik **"Deploy Project"**

✅ **Selesai!** 

URL API Anda akan jadi:
```
https://api-validator-xxxxx.deno.dev
