export default function SSEDemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        margin: 0,
        padding: 0,
      }}
    >
      {children}
    </div>
  );
}
