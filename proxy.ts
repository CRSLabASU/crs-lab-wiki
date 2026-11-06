import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, editorFromSession } from "@/lib/auth";

// The whole wiki is behind sign-in. Everything below runs through here except
// what the matcher leaves out.
const PUBLIC_PATHS = new Set([
  "/login",
  // Called by QStash, which signs its requests instead (see lib/charging).
  "/api/charging/remind",
]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const email = await editorFromSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (email) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip build assets and the files in public/. The image optimizer fetches
  // /robot-media without the visitor's cookie, so photos would break if they
  // needed a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robot-media/).*)"],
};
