import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import ClientSSEComponent from "@/app/(protected)/home/temps/ClientSSEComponent";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      <ClientSSEComponent />
    </>
  );
};

export default HomePage;
