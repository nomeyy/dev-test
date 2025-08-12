import { NextResponse } from "next/server";
import {
  getSession,
  isProtectedRoute,
  isPublicRoute,
  isUniversalRoute,
} from "@/features/auth";
import { paths } from "@/config/routes";

/**
 * Authentication middleware that enforces route access rules.
 */
export const authMiddleware = getSession(async (request) => {
  const path = request.nextUrl.pathname;

  // Universal routes can be accessed by everyone
  if (isUniversalRoute(path)) {
    return NextResponse.next();
  }

  // Check authentication status
  const hasSession = !!request.auth;

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(path) && !hasSession) {
    return NextResponse.redirect(new URL(paths.landingPage, request.url));
  }

  // Redirect authenticated users away from public routes
  if (isPublicRoute(path) && hasSession) {
    return NextResponse.redirect(new URL(paths.homePage, request.url));
  }

  // Continue to the next middleware or route handler
  return NextResponse.next();
});
