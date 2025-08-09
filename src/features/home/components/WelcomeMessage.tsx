import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

const WelcomeMessage = ({
  name,
  signOut,
}: {
  name: string;
  signOut: () => void;
}) => {
  return (
    <>
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Welcome <span className="text-[hsl(280,100%,70%)]">{name}</span>!
      </h1>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={signOut}>{"Sign out"}</Button>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        <Link href="/broadcast-panel">
          <Button variant="secondary" className="w-full">
            Broadcast Event
          </Button>
        </Link>
        <Link href="/subscriber-panel">
          <Button variant="secondary" className="w-full">
            Go to Event
          </Button>
        </Link>
      </div>
    </>
  );
};

export default WelcomeMessage;
