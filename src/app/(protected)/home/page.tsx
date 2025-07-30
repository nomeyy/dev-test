import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import { SSEDemo } from "../../../features/sse/components/SSEDemo";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <div className="space-y-8">
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <SSEDemo userId={session?.user?.id} />
    </div>
  );
};

export default HomePage;
