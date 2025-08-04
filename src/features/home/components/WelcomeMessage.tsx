import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { paths } from "@/config/routes";

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
        <div className="flex gap-4">
          <Link href={paths.sseDemoPage}>
            <Button variant="secondary">SSE Demo</Button>
          </Link>
        </div>
        <Button onClick={signOut} variant="destructive">
          Sign out
        </Button>
      </div>
    </>
  );
};

export default WelcomeMessage;
