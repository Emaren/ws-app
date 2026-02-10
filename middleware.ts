import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isEditorialRole } from "./src/lib/rbac";

function withCallbackUrl(request: NextRequest): string {
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL(withCallbackUrl(request), request.url));
  }

  const tokenRole = typeof token.role === "string" ? token.role : undefined;
  if (!isEditorialRole(tokenRole)) {
    return NextResponse.redirect(new URL("/?error=forbidden", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/drafts/:path*"],
};
