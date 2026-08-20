import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/painel") && !req.cookies.get("eaimesa_owner")) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (
    path.startsWith("/garcom") &&
    !path.startsWith("/garcom/login") &&
    !req.cookies.get("eaimesa_staff")
  ) {
    const login = new URL("/garcom/login", req.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/painel", "/painel/:path*", "/garcom", "/garcom/:path*"] };
