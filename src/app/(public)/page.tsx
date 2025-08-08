"use client";
import Link from "next/link";

const LandingPage = () => (
  <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
    {/* Animated Background Elements */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl"></div>
      <div className="absolute right-1/4 bottom-1/4 h-80 w-80 animate-pulse rounded-full bg-blue-500/10 blur-3xl delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 h-64 w-64 animate-pulse rounded-full bg-indigo-500/10 blur-3xl delay-500"></div>
      <div className="absolute top-10 right-10 h-32 w-32 animate-bounce rounded-full bg-pink-500/20 blur-2xl"></div>
      <div className="absolute bottom-10 left-10 h-40 w-40 animate-bounce rounded-full bg-cyan-500/20 blur-2xl delay-300"></div>
    </div>

    {/* Floating Particles */}
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="animate-float absolute h-2 w-2 rounded-full bg-white/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>

    {/* Main Content */}
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
      {/* Hero Section */}
      <div className="mx-auto mb-16 max-w-4xl text-center">
        {/* Main Title */}
        <div className="mb-8">
          <h1 className="mb-4 text-6xl font-black md:text-8xl">
            <span className="animate-gradient bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Real-Time
            </span>
            <br />
            <span className="text-white drop-shadow-2xl">Notification Hub</span>
          </h1>
          <div className="mx-auto mb-6 h-1 w-32 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
        </div>

        {/* Subtitle */}
        <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed font-light text-gray-300 md:text-2xl">
          Experience seamless real-time communication with our advanced
          notification system. Connect instantly, manage efficiently, and stay
          informed with lightning-fast updates.
        </p>

        {/* Feature Highlight */}
        <div className="mb-16 flex items-center justify-center space-x-2">
          <div className="h-3 w-3 animate-pulse rounded-full bg-green-400"></div>
          <span className="font-medium text-green-400">
            Live Server-Sent Events
          </span>
          <div className="h-3 w-3 animate-pulse rounded-full bg-green-400 delay-300"></div>
        </div>
      </div>

      {/* Cards Section */}
      <div className="mx-auto mb-16 grid w-full max-w-6xl gap-8 md:grid-cols-2">
        {/* Admin Card */}
        <div className="group relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-30 blur-xl transition-opacity duration-500 group-hover:opacity-50"></div>
          <div className="relative rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-purple-500/25">
            {/* Admin Icon */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 shadow-2xl">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>

            <h2 className="mb-4 text-3xl font-bold text-white">
              Admin Dashboard
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-gray-300">
              Take full control of your notification system. Monitor connected
              clients, send targeted messages, and manage real-time
              communications with precision.
            </p>

            {/* Admin Features */}
            <div className="mb-8 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                <span className="text-purple-200">
                  Monitor all connected clients in real-time
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-pink-400"></div>
                <span className="text-purple-200">
                  Send targeted notifications to specific users
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-purple-400"></div>
                <span className="text-purple-200">
                  Broadcast messages to all connected clients
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-pink-400"></div>
                <span className="text-purple-200">
                  Track connection status and activity logs
                </span>
              </div>
            </div>

            <Link
              href="/admin"
              className="group/btn relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-600 hover:to-pink-600"
            >
              <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-1000 group-hover/btn:translate-x-full"></div>
              <span className="relative flex items-center space-x-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Access Admin Panel</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Client Card */}
        <div className="group relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-30 blur-xl transition-opacity duration-500 group-hover:opacity-50"></div>
          <div className="relative rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-blue-500/25">
            {/* Client Icon */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-2xl">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-5 5-5-5h5V12H9l4-4 4 4h-2v5z"
                />
              </svg>
            </div>

            <h2 className="mb-4 text-3xl font-bold text-white">
              Client Portal
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-gray-300">
              Connect instantly to receive real-time notifications. Stay updated
              with live messages, alerts, and important communications as they
              happen.
            </p>

            {/* Client Features */}
            <div className="mb-8 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span className="text-blue-200">
                  Instant connection with real-time updates
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                <span className="text-blue-200">
                  Receive notifications in real-time
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                <span className="text-blue-200">
                  Browser notification support
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400"></div>
                <span className="text-blue-200">
                  Clean, intuitive message interface
                </span>
              </div>
            </div>

            <Link
              href="/client"
              className="group/btn relative inline-flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-cyan-600"
            >
              <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/20 transition-transform duration-1000 group-hover/btn:translate-x-full"></div>
              <span className="relative flex items-center space-x-2">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>Join as Client</span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Auth Link (if needed) */}
      <div className="text-center">
        <Link
          href="/api/auth/signin"
          className="group relative inline-flex items-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 px-8 py-3 font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white/20"
        >
          <div className="absolute inset-0 -translate-x-full -skew-x-12 transform bg-white/10 transition-transform duration-700 group-hover:translate-x-full"></div>
          <span className="relative flex items-center space-x-2">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            <span>Sign In</span>
          </span>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-gray-400">
        <p className="text-sm">
          Built with Next.js • Server-Sent Events • Real-time Communication
        </p>
      </div>
    </div>

    {/* CSS Animations */}
    <style jsx>{`
      @keyframes gradient {
        0%,
        100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0px) rotate(0deg);
          opacity: 0.7;
        }
        50% {
          transform: translateY(-20px) rotate(180deg);
          opacity: 1;
        }
      }

      .animate-gradient {
        background-size: 200% 200%;
        animation: gradient 3s ease infinite;
      }

      .animate-float {
        animation: float linear infinite;
      }
    `}</style>
  </div>
);

export default LandingPage;
