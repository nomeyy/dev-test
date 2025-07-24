import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage, SSENotifications } from "@/features/home";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <SSENotifications />
    </>
  );
};

export default HomePage;
