"use server";

import { signIn } from "@/features/auth/handlers";
import { redirect } from "next/navigation";

/**
 * Demo login action that signs in with demo credentials
 * This allows immediate access for testing purposes
 */
export async function demoLogin() {
  try {
    console.log("Starting demo login...");

    const result = await signIn("credentials", {
      email: "demo@nomey.com",
      password: "demo123",
      redirect: false,
    });

    console.log("Demo login result:", result);

    if (result?.ok) {
      console.log("Demo login successful, redirecting to /sse-demo");
      redirect("/sse-demo");
    } else {
      console.error("Demo login failed:", result);
      throw new Error("Demo login failed");
    }
  } catch (error) {
    console.error("Demo login failed:", error);
    throw error;
  }
}
