import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";

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
export const nextAuthConfig = {
  providers: [
    DiscordProvider,
    CredentialsProvider({
      id: "credentials",
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "any@email.com" },
        password: {
          label: "Password",
          type: "password",
          placeholder: "any password",
        },
      },
      async authorize(credentials) {
        console.log("Credentials provider called with:", credentials);

        // Accept any credentials for demo purposes
        if (credentials?.email && credentials?.password) {
          const email = credentials.email as string;
          console.log("Creating/finding user with email:", email);

          try {
            // Create or find user in database
            const user = await db.user.upsert({
              where: { email },
              update: {},
              create: {
                email,
                name: email.split("@")[0] || "Demo User",
                emailVerified: new Date(),
              },
            });

            console.log("User created/found:", user);

            return {
              id: user.id,
              email: user.email,
              name: user.name,
            };
          } catch (error) {
            console.error("Error creating/finding user:", error);
            return null;
          }
        }
        console.log("No valid credentials provided");
        return null;
      },
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: ({ session, token }) => {
      console.log("Session callback - session:", session, "token:", token);
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
      };
    },
    jwt: ({ token, user }) => {
      console.log("JWT callback - token:", token, "user:", user);
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  debug: true,
} satisfies NextAuthConfig;
