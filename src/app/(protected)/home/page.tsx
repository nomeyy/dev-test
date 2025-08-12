import { getSession, signOut } from "@/features/auth";
import { Connections } from "@/features/home";
import { Button } from "@/shared/components/ui/button";

const HomePage = async () => {
  const session = await getSession();

  console.log("Session data:", session);

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
    <div>
      <Connections />
      <Button variant={"secondary"} onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
};

export default HomePage;
