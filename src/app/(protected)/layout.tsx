import { redirect, RedirectType } from "next/navigation";
import { paths } from "@/config/routes";
import MainContainer from "@/shared/components/layout/MainContainer";
import { getSession, SessionProvider } from "@/features/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  console.log("🚀 ~ session:", session);

  // The middleware has confirmed we have a cookie, but we
  // still need to check if the user is authenticated
  if (!session?.user) {
    console.log("No session user, redirecting to landing page");
    redirect(paths.landingPage, RedirectType.replace);
  }

  return (
    <SessionProvider session={session}>
      <MainContainer>{children}</MainContainer>
    </SessionProvider>
  );
}
