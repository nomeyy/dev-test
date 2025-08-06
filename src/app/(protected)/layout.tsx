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

  if (!session?.user) {
    redirect(paths.landingPage, RedirectType.replace);
  }

  return (
    <SessionProvider session={session}>
      <MainContainer>{children}</MainContainer>
    </SessionProvider>
  );
}
