import { LhInputForm } from "@/components/lh/input-form";

export default async function Home(params: unknown) {
  console.log(params);
  return (
    <div className='max-w-screen-2xl mx-auto'>
      <LhInputForm />
    </div>
  );
}

