export default async function PageSpeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
      <h1 className="mx-auto px-3 text-center text-xl font-extrabold sm:text-2xl">
        Page Speed Insights
      </h1>
      {children}
    </div>
  );
}
