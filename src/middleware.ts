import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiPipeline, appPipeline } from "./features/middleware";

export async function middleware(
  request: NextRequest,
): Promise<NextResponse | Response> {
  try {
    const path = request.nextUrl.pathname;
    const isApiRoute = path.startsWith("/api/");

    const response = await (isApiRoute ? apiPipeline : appPipeline)(request);
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
 
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico).*)"],
};
