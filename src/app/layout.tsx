import { RealTimeComponent } from "./components/RealTimeComponent";
import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
          <RealTimeComponent />
          {/* Register service worker */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(console.error);
                  });
                }
              `,
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
