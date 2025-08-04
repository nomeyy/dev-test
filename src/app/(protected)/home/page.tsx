import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import { SSEClient } from "./SSEClient";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      {session?.user?.id && <SSEClient userId={session.user.id} />}
    </>
  );
};

export default HomePage;
