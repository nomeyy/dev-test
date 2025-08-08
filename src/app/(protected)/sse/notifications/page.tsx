import { paths } from "@/config/routes";
import { getSession } from "@/features/auth";
import { Notifications } from "@/features/notifications";
import { redirect, RedirectType } from "next/navigation";
import React from "react";

const SSENotificationsPage = async () => {
  const session = await getSession();

  if (!session?.user) {
    redirect(paths.landingPage, RedirectType.replace);
  }

  return <Notifications user={session.user} />;
};

export default SSENotificationsPage;
