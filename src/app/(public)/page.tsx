import Link from "next/link";
import ClientComponent from "./temps/ClientComponent";
import ServerComponent from "./temps/ServerComponent";
import { Button } from "@/shared/components/ui/button";
import { demoLogin } from "@/features/auth";

const LandingPage = () => (
  <>
    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
      Create <span className="text-[hsl(280,100%,70%)]">Nomey</span>
    </h1>

    <div className="max-w-[600px] space-y-5 text-left">
      <ClientComponent />

      <ServerComponent />
    </div>

    <div className="flex gap-4">
      <Link
        href={"/api/auth/signin"}
        className={`rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20`}
      >
        {"Sign in"}
      </Link>

      <form action={demoLogin}>
        <Button type="submit" className="rounded-full">
          🚀 Quick Demo
        </Button>
      </form>
    </div>
  </>
);

export default LandingPage;
