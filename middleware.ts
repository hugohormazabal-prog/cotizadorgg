import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Autorizacion requerida", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="GGelectrics Admin", charset="UTF-8"',
    },
  });
}

export function middleware(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedUser = process.env.GGELECTRICS_ADMIN_USER;
  const expectedPassword = process.env.GGELECTRICS_ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return unauthorizedResponse();
  }

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  try {
    const encoded = authHeader.split(" ")[1] ?? "";
    const decoded = atob(encoded);
    const [user, password] = decoded.split(":");

    if (user === expectedUser && password === expectedPassword) {
      return NextResponse.next();
    }
  } catch {}

  return unauthorizedResponse();
}

export const config = {
  matcher: ["/asesor/:path*", "/admin/:path*", "/api/admin/:path*"],
};
