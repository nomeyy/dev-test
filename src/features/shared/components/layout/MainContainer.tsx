import { cn } from "@/shared/utils";
import { type HTMLAttributes } from "react";
import Link from "next/link";

interface MainContainerProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

const MainContainer = ({
  children,
  className,
  ...props
}: MainContainerProps) => {
  return (
    <main
      className={cn(
        `flex min-h-screen flex-col items-center gap-4 bg-gradient-to-b from-[#2e026d] to-[#15162c] p-2 text-white sm:gap-6 sm:p-4 lg:gap-8 lg:p-8`,
        className,
      )}
      {...props}
    >
      {/* Simple Navigation */}
      <nav className="w-full max-w-4xl">
        <div className="flex gap-4 rounded-lg bg-black/20 p-4">
          <Link
            href="/home"
            className="rounded bg-blue-600 px-3 py-2 transition-colors hover:bg-blue-700"
          >
            Home
          </Link>
          <Link
            href="/sse-demo"
            className="rounded bg-green-600 px-3 py-2 transition-colors hover:bg-green-700"
          >
            SSE Demo
          </Link>
          <Link
            href="/reels"
            className="rounded bg-purple-600 px-3 py-2 transition-colors hover:bg-purple-700"
          >
            Reels
          </Link>
        </div>
      </nav>
      {children}
    </main>
  );
};

export default MainContainer;
