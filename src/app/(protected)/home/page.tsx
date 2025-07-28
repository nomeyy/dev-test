import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import { SSEClient } from "../SSEClient";
import { sseManager } from "@/utils/sse-manager";

const HomePage = async () => {
  const session = await getSession();
  const HEARTBEAT_INTERVAL = 1000 * 15;

  const handleSignOut = async () => {
    "use server";
    sseManager.broadcast("user-disconnected", {
      userId: session?.user.id,
    });
    await signOut();
  };

  setInterval(() => {
    sseManager.heartbeat();
  }, HEARTBEAT_INTERVAL);

  return (
    <>
      <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
      {session?.user?.id && <SSEClient userId={session.user.id} />}
    </>
  );
};

export default HomePage;
