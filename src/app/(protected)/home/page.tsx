import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import { SseDemo } from "@/features/sse/components";

const HomePage = async () => {
  const session = await getSession();
  const userId = session?.user?.id;
  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <div className="space-y-4">
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <SseDemo userId={userId} />
    </div>
  );
};

export default HomePage;
