import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".") && !pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const cookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (pathname === "/login" && cookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!isPublic && !cookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
