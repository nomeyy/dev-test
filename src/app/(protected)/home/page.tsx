import SSEClient from "@/component/SSEClient";
import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <SSEClient
        clientId={session?.user.id!}
        clientName={session?.user.name!}
      />
    </>
  );
};

export default HomePage;
