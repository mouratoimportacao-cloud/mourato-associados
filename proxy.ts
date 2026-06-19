import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "./lib/jwt";

const JWT_SECRET = process.env.JWT_SECRET || "mourato-associados-default-secret-key-12345";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect administrative area
  if (pathname.startsWith("/admin")) {
    // Exclude the login page itself to avoid redirect loops
    if (pathname.startsWith("/admin/login")) {
      const token = request.cookies.get("admin_session")?.value;
      if (token) {
        const payload = await verifyJwt(token, JWT_SECRET);
        if (payload && payload.tipo === "admin") {
          // If already logged in, redirect to admin dashboard
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }
      return NextResponse.next();
    }

    const token = request.cookies.get("admin_session")?.value;
    if (!token) {
      // Redirect to login page
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    const payload = await verifyJwt(token, JWT_SECRET);
    if (!payload || payload.tipo !== "admin") {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("admin_session");
      return response;
    }
  }

  if (pathname.startsWith("/lojista/painel")) {
    const token = request.cookies.get("lojista_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/lojista", request.url));
    }

    const payload = await verifyJwt(token, JWT_SECRET);
    if (!payload || payload.tipo !== "lojista") {
      const response = NextResponse.redirect(new URL("/lojista", request.url));
      response.cookies.delete("lojista_session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/lojista/painel/:path*"],
};
