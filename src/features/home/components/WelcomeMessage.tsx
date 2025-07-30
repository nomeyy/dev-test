import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
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
          <Link
            href={paths.sseTestPage}
            className={`rounded-full bg-blue-500/20 px-10 py-3 font-semibold no-underline transition hover:bg-blue-500/30`}
          >
            {"Test SSE"}
          </Link>
          <Button onClick={signOut}>{"Sign out"}</Button>
        </div>
      </div>
    </>
  );
};

export default WelcomeMessage;
