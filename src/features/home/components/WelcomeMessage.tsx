"use client";

import { Button } from "@/shared/components/ui/button";
import { useRouter } from "next/navigation";

const WelcomeMessage = ({
  name,
  signOut,
}: {
  name: string;
  signOut: () => void;
}) => {
  const router = useRouter();
  const testSSE = () => {
    // navigate to /sse-test  page
    router.push("/sse-test");
  };
  return (
    <>
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Welcome <span className="text-[hsl(280,100%,70%)]">{name}</span>!
      </h1>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={testSSE}>{"Test SSE"}</Button>
        <Button onClick={signOut}>{"Sign out"}</Button>
      </div>
    </>
  );
};

export default WelcomeMessage;
