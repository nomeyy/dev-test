import { getSession, signOut } from "@/features/auth";
import { WelcomeMessage } from "@/features/home";
import NotificationCenter from "@/components/NotificationCenter";
import SSEDemo from "@/components/SSEDemo";
import {SSEMessageHistory} from "@/components/SSEMessageHistory";
import {SSETester} from "@/components/SSETester";
import React from "react";

const HomePage = async () => {
  const session = await getSession();

  const handleSignOut = async () => {
    "use server";
    await signOut();
  };

  return (
      <>
        <WelcomeMessage name={session?.user.name ?? ""} signOut={handleSignOut} />
        <NotificationCenter userId={session?.user?.id || ""}/>
        <SSEDemo/>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SSEMessageHistory userId={session?.user?.id || ""} />
          <SSETester />
        </div>
      </>

  );
};

export default HomePage;
