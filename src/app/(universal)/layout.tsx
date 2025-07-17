import { TranslationProvider } from "@/features/i18n";
import { getLanguage } from "@/features/i18n";
import MainContainer from "@/shared/components/layout/MainContainer";
import { getSession, PublicSessionProvider } from "@/features/auth";

const I18N_NAMESPACES = ["home", "translation", "sse"];

export default async function UniversalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, language] = await Promise.all([getSession(), getLanguage()]);

  // It doesn't matter if the user is authenticated or not,
  // so just pass down a nullable session.
  return (
    <PublicSessionProvider session={session}>
      <TranslationProvider language={language} namespaces={I18N_NAMESPACES}>
        <MainContainer>{children}</MainContainer>
      </TranslationProvider>
    </PublicSessionProvider>
  );
}
