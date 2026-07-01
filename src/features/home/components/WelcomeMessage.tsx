"use client";

import { Button } from "@/shared/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

const WelcomeMessage = ({
  name,
  signOut,
}: {
  name: string;
  signOut: () => void;
}) => {
  const router = useRouter();

  return (
    <>
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Welcome <span className="text-[hsl(280,100%,70%)]">{name}</span>!
      </h1>
      <div className="flex flex-col items-center gap-2">
        <Button onClick={signOut}>{"Sign out"}</Button>
        <Button>
          <a
            href="/home/real-time"
            style={{ textDecoration: "none", color: "white" }}
          >
            {"Real Time Dashboard"}
          </a>
        </Button>
      </div>
    </>
  );
};

export default WelcomeMessage;
