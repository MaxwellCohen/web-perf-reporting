import Link from 'next/link';
import { ModeToggle } from '../ui/darkmode';

export function TopNav() {
  return (
    <nav className="flex w-full flex-wrap items-center justify-between border-b p-4 align-baseline text-xl font-semibold print:hidden ">
      <Link href="/" className="">
        <span className="text-1xl break-keep font-bold">
          Web Performance Reporting
        </span>
      </Link>
      <div className="flex flex-row flex-wrap items-center gap-4">
        <Link href="/latest-crux" className="">
          <span className="text-md break-keep font-bold">Latest</span>
        </Link>
        <span className="text-xl font-bold"> | </span>
        <Link href="/historical-crux" className="">
          <span className="text-md break-keep font-bold">Historical</span>
        </Link>
        <span className="text-xl font-bold"> | </span>
        <Link href="/page-speed" className="">
          <span className="text-md break-keep font-bold">Insights</span>
        </Link>
        <ModeToggle />
      </div>
    </nav>
  );
}
