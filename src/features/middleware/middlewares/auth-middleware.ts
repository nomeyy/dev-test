import { NextResponse } from "next/server";
import {
  isProtectedRoute,
  isPublicRoute,
  isUniversalRoute,
} from "@/features/auth";
import { authConfig } from "@/config/auth";
import { paths } from "@/config/routes";
import type { Middleware } from "../types";

/**
 * Authentication middleware that enforces route access rules.
 */
export const authMiddleware: Middleware = async (request, next) => {
  const path = request.nextUrl.pathname;

  // Universal routes can be accessed by everyone
  if (isUniversalRoute(path)) {
    return await next();
  }

  // Check authentication status - check both session cookie names
  const sessionCookie = request.cookies.get(authConfig.sessionCookieName);
  const csrfCookie = request.cookies.get(authConfig.csrfCookieName);
  const hasSession = !!(sessionCookie ?? csrfCookie);

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(path) && !hasSession) {
    const redirectUrl = new URL(paths.landingPage, request.url);
    console.log(
      `Redirecting unauthenticated user from ${path} to ${redirectUrl.pathname}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from public routes (except landing page)
  if (isPublicRoute(path) && hasSession && path !== paths.landingPage) {
    const redirectUrl = new URL(paths.homePage, request.url);
    console.log(
      `Redirecting authenticated user from ${path} to ${redirectUrl.pathname}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Continue to the next middleware or route handler
  return await next();
};
