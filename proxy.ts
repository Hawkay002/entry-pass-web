// proxy.ts — verify the session cookie on every request and gate
// protected routes. Runs on the Edge runtime.
// (Next 16 renamed the middleware convention to "proxy".)
//
// Public paths: /login, /api/login, /api/logout, and static assets.
// Everything else requires a valid session cookie, else redirect to /login.

import { NextResponse, type NextRequest } from "next/server";
import {
  authMiddleware,
  redirectToLogin,
} from "next-firebase-auth-edge";
import { authConfig } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth checks.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  return authMiddleware(request, {
    loginPath: "/api/login",
    logoutPath: "/api/logout",
    cookieName: authConfig.cookieName,
    cookieSignatureKeys: authConfig.cookieSignatureKeys,
    cookieSerializeOptions: authConfig.cookieSerializeOptions,
    serviceAccount: authConfig.serviceAccount as never,
    apiKey: authConfig.apiKey,

    handleValidToken: async () => NextResponse.next(),

    handleInvalidToken: async () =>
      redirectToLogin(request, {
        path: "/login",
        publicPaths: PUBLIC_PATHS,
      }),

    handleError: async (error) => {
      console.error("[auth middleware] error:", error);
      return redirectToLogin(request, {
        path: "/login",
        publicPaths: PUBLIC_PATHS,
      });
    },
  });
}

export const config = {
  // Run on everything except static assets and the auth API routes
  // (those are handled explicitly as public above, but excluding them here
  // avoids the middleware overhead entirely).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:mp3|png|svg|jpg|jpeg|webp|ico)$).*)",
  ],
};
