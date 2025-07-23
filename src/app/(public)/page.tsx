import Link from "next/link";
import ClientComponent from "./temps/ClientComponent";
import ServerComponent from "./temps/ServerComponent";

const LandingPage = () => (
  <>
    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
      Create <span className="text-[hsl(280,100%,70%)]">Nomey</span>
    </h1>

    <div className="max-w-[600px] space-y-5 text-left">
      <ClientComponent />

      <ServerComponent />
    </div>

    <div className="flex flex-col gap-4 sm:flex-row">
      <Link
        href={"/api/auth/signin"}
        className={`rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20`}
      >
        {"Sign in"}
      </Link>

      <Link
        href={"/sse-test"}
        className={`rounded-full border border-purple-500/50 bg-purple-600/20 px-10 py-3 font-semibold no-underline transition hover:bg-purple-600/30`}
      >
        {"Test SSE"}
      </Link>
    </div>
  </>
);

export default LandingPage;
