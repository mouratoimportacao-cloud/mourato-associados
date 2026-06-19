const encoder = new TextEncoder();

function base64UrlEncode(str: string | Uint8Array): string {
  let base64 = "";
  if (typeof str === "string") {
    // Escape standard characters for btoa to handle UTF-8 properly
    base64 = btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } else {
    let binary = "";
    const len = str.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(str[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signJwt(payload: any, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(dataToSign)
  );
  
  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const dataToVerify = encoder.encode(`${header}.${payload}`);
    const signatureBytes = base64UrlDecode(signature);
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as any,
      dataToVerify
    );
    
    if (!isValid) return null;
    
    const decodedPayload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (decodedPayload.exp && decodedPayload.exp * 1000 < Date.now()) {
      return null; // Expired
    }
    return decodedPayload;
  } catch {
    return null;
  }
}
