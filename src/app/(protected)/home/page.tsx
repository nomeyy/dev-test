import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import { TranslationProvider, getLanguage } from "@/features/i18n";
import { RealtimeDemo } from "@/features/realtime";

export default async function HomePage() {
  const session = await getSession();
  const language = await getLanguage();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <WelcomeMessage
          name={session?.user.name ?? ""}
          signOut={handleSignOut}
        />
      </div>

      <TranslationProvider language={language} namespaces={["realtime"]}>
        <RealtimeDemo />
      </TranslationProvider>
    </div>
  );
}
