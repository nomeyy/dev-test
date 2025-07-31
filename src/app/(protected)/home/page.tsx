import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import SseDashboardComponent from "./components/sse-test-component";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
    <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
    <SseDashboardComponent userId={session?.user.id ?? ""} />
    </>
  );
};

export default HomePage;
