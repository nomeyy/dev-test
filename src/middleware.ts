import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  apiPipeline,
  appPipeline,
  sseMiddlewares,
} from "./features/middleware";
import { compose } from "./features/middleware/utils";

/**
 * Main Next.js middleware handler
 */
export async function middleware(
  request: NextRequest,
): Promise<NextResponse | Response> {
  try {
    const path = request.nextUrl.pathname;
    const isApiRoute = path.startsWith("/api/");
    const isSSERoute = path.startsWith("/api/sse");

    // Execute the appropriate middleware pipeline
    let response;
    if (isSSERoute) {
      // Use SSE-specific middleware (no rate limiting)
      const ssePipeline = compose(sseMiddlewares);
      response = await ssePipeline(request);
    } else if (isApiRoute) {
      // Use regular API middleware
      response = await apiPipeline(request);
    } else {
      // Use app middleware
      response = await appPipeline(request);
    }

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
  // Specify which routes the middleware applies to
  // Exclude health checks, static files, and favicon
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
