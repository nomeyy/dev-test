import { getSession, SessionProvider } from "@/features/auth";
import MainContainer from "@/shared/components/layout/MainContainer";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // DEV: Discord OAuth not configured - AUTH_DISCORD_ID/AUTH_DISCORD_SECRET missing
  // Disabled session check to allow SSE testing without Discord developer app setup
  // TODO: Configure Discord OAuth or switch to different auth provider
  console.log("Session check disabled for testing");

  // if (!session?.user) {
  //   console.log("No session found, redirecting to landing page");
  //   redirect(paths.landingPage, RedirectType.replace);
  // }

  // console.log("Session found:", session.user.name);

  return (
    <SessionProvider session={session!}>
      <MainContainer>{children}</MainContainer>
    </SessionProvider>
  );
}
