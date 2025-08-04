import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import SSEClient from "@/components/SSEClient";
import LiveUpdates from "@/components/LiveUpdates";

const HomePage = async () => {
  const session = await getSession();
  const userId = session?.user?.id; // 

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user?.name ?? ""} signOut={handleSignOut} />
      {userId && <SSEClient userId={userId} />}
      {userId && <LiveUpdates userId={userId} />} 
    </>
  );
};

export default HomePage;





