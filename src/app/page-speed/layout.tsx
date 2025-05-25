
export default async function Home({
  children
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  children: React.ReactNode;
}) {
  

  return (
    <div className="mx-auto max-w-screen-2xl">
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        Page Speed Insights
      </h1>
      {children}
    </div>
  );
}
