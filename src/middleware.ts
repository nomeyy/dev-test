import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiPipeline, appPipeline } from "./features/middleware";

/**
 * Main Next.js middleware handler
 */
export async function middleware(
  request: NextRequest,
): Promise<NextResponse | Response> {
  try {
    const path = request.nextUrl.pathname;
    const isApiRoute = path.startsWith("/api/");

    // Execute the appropriate middleware pipeline
    const response = await (isApiRoute ? apiPipeline : appPipeline)(request);

    // Ensure we return a proper Response object
    if (!response) {
      return NextResponse.next();
    }
    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const config = {
  // Exclude sw.js and static assets so the SW is fetched with no redirects
  matcher: [
    "/((?!api/health|_next/static|_next/image|favicon.ico|sw.js|socket.io).*)",
  ],
};
