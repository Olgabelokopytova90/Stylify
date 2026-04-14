export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <main className="content">{children}</main>
    </div>
  );
}
