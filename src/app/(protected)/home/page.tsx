import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import SSEDemoPage from "../sse-demo/page";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <SSEDemoPage />
    </>
  );
};

export default HomePage;
