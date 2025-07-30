import { Button } from "@/shared/components/ui/button";

const WelcomeMessage = ({
  name,
  signOut,
}: {
  name: string;
  signOut: () => void;
}) => {
  return (
    <div className="mx-auto mt-10 flex max-w-xl flex-col items-center space-y-6 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-teal-50 to-white p-8 shadow-2xl">
      <h1 className="text-center text-4xl font-black tracking-tight text-purple-900 sm:text-5xl">
        Welcome{" "}
        <span className="rounded-xl bg-teal-200 px-3 py-1 align-middle text-4xl font-extrabold text-teal-900 shadow-inner sm:text-5xl">
          {name}
        </span>
        !
      </h1>
      <div className="flex w-full flex-col items-center gap-2">
        <Button
          onClick={signOut}
          className="w-full rounded-xl bg-purple-600 px-6 py-2 font-bold text-white shadow hover:bg-purple-700 sm:w-auto"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
};

export default WelcomeMessage;
