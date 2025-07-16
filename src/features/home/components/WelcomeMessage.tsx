import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

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
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Button onClick={signOut}>{"Sign out"}</Button>
          <Button asChild>
            <Link href="/sse-demo">🚀 Demo SSE</Link>
          </Button>
        </div>
        <p className="max-w-md text-center text-sm text-gray-600">
          Click "Demo SSE" to test real-time notifications and upload progress
          tracking
        </p>
      </div>
    </>
  );
};

export default WelcomeMessage;
