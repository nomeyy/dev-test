import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "@/lib/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
const providers: NextAuthConfig["providers"] = [];

// Always include simple username login for testing multiple profiles
providers.push(
  CredentialsProvider({
    id: "username",
    name: "Username Login",
    credentials: { 
      username: { label: "Username", type: "text", placeholder: "Enter username" },
      password: { label: "Password", type: "password", placeholder: "Enter password" }
    },
    async authorize(input) {
      const creds = z
        .object({ 
          username: z.string().min(1),
          password: z.string().min(1)
        })
        .safeParse(input);
      if (!creds.success) return null;
      
      const { username, password } = creds.data;
      
      // Simple test credentials - in production, you'd hash and check against database
      // For now, accept any username with password "test123"
      if (password === "test123") {
        return { 
          id: `user-${username}`, 
          name: username, 
          email: `${username}@test.local`,
          image: `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
        };
      }
      
      return null;
    },
  })
);

// Include Discord if env vars are set
const hasDiscordEnv = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
if (hasDiscordEnv) {
  providers.push(DiscordProvider);
} else {
  // Fallback dev credentials when Discord not configured
  providers.push(
    CredentialsProvider({
      id: "dev",
      name: "Dev Login",
      credentials: { name: { label: "Name", type: "text" } },
      async authorize(input) {
        const creds = z
          .object({ name: z.string().min(1) })
          .safeParse(input);
        if (!creds.success) return null;
        const name = creds.data.name;
        return { id: name, name, email: `${name}@example.test` };
      },
    })
  );
}

export const nextAuthConfig = {
  providers,
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
