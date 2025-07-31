import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";

const HomePage = async () => {
  const session = await getSession();

  return <WelcomeMessage name={session?.user.name ?? ""} signOut={signOut} />;
};

export default HomePage;
