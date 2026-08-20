import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasSession = req.cookies.get("eaimesa_owner");

  if (path.startsWith("/painel") && !hasSession) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (path.startsWith("/garcom") && !hasSession) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (path === "/garcom/login") {
    return NextResponse.redirect(new URL("/login?next=/garcom", req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/painel", "/painel/:path*", "/garcom", "/garcom/:path*"] };
