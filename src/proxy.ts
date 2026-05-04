import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyTokenForEdge, createTokenForEdge } from "@/lib/jwt";

const AUTH_COOKIE_NAME = "mn_token";
const IDLE_MAX_AGE_SECONDS = 5 * 60;

const secureCookie =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

const CORS_HEADERS = [
  { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
  { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Next-Action, RSC" },
  { key: "Access-Control-Allow-Credentials", value: "true" },
] as const;

function getCorsOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return origin;
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const origin = getCorsOrigin(request);

  if (request.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    CORS_HEADERS.forEach(({ key, value }) => res.headers.set(key, value));
    if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
    return res;
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/api-docs" || pathname === "/openapi.yaml") {
    return addCors(NextResponse.next(), origin);
  }

  if (pathname === "/login") {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return addCors(NextResponse.next(), origin);
    const session = await verifyTokenForEdge(token);
    if (!session) return addCors(NextResponse.next(), origin);
    if (session.mustChangePassword) {
      return addCors(NextResponse.redirect(new URL("/change-password", request.url)), origin);
    }
    const res = session.role === "PLAYER"
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.redirect(new URL("/admin/users", request.url));
    return addCors(res, origin);
  }

  if (pathname === "/change-password") {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      return addCors(res, origin);
    }
    const session = await verifyTokenForEdge(token);
    if (!session) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return addCors(res, origin);
    }
    const res = NextResponse.next();
    try {
      const newToken = await createTokenForEdge(session);
      res.cookies.set(AUTH_COOKIE_NAME, newToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: secureCookie,
        maxAge: IDLE_MAX_AGE_SECONDS,
      });
    } catch {
      // ignore
    }
    return addCors(res, origin);
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    return addCors(res, origin);
  }
  const session = await verifyTokenForEdge(token);
  if (!session) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return addCors(res, origin);
  }
  if (session.mustChangePassword) {
    const res = NextResponse.redirect(new URL("/change-password", request.url));
    try {
      const newToken = await createTokenForEdge(session);
      res.cookies.set(AUTH_COOKIE_NAME, newToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: secureCookie,
        maxAge: IDLE_MAX_AGE_SECONDS,
      });
    } catch {
      // ignore
    }
    return addCors(res, origin);
  }
  const res = NextResponse.next();
  try {
    const newToken = await createTokenForEdge(session);
    res.cookies.set(AUTH_COOKIE_NAME, newToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
      maxAge: IDLE_MAX_AGE_SECONDS,
    });
  } catch {
    // If token creation fails, continue without refreshing (session still valid for this request)
  }
  return addCors(res, origin);
}

function addCors(res: NextResponse, origin: string | null) {
  CORS_HEADERS.forEach(({ key, value }) => res.headers.set(key, value));
  if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
