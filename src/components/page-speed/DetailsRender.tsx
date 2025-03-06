// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable @next/next/no-img-element */
// import { AuditDetailFilmstrip } from '@/lib/schema';
// import { Fragment, useEffect, useState } from 'react';
// import {
//   Carousel,
//   CarouselApi,
//   CarouselContent,
//   CarouselItem,
//   CarouselNext,
//   CarouselPrevious,
// } from '../ui/carousel';
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogTitle,
//   DialogTrigger,
// } from '../ui/dialog';
// import { Button } from '../ui/button';

// export const LhLink = ({ text, url }: { text: string; url: string }) => {
//   // Check if URL is valid or has allowed protocol
//   const isValidUrl =
//     url &&
//     (url.startsWith('http://') ||
//       url.startsWith('https://') ||
//       url.startsWith('data:'));

//   if (!isValidUrl) {
//     return <div>{text}</div>;
//   }

//   return (
//     <a href={url} rel="noopener" target="_blank" className="lh-link">
//       {text}
//     </a>
//   );
// };

// // TextURL component
// export const TextURL = ({ text }: { text: string }) => {
//   const url = text;
//   let displayedPath;
//   let displayedHost;
//   let title;

//   try {
//     const parsed = {
//       file: '/',
//       origin: url,
//       hostname: '',
//     }; // Replace with actual Util.parseURL implementation
//     displayedPath = parsed.file === '/' ? parsed.origin : parsed.file;
//     displayedHost =
//       parsed.file === '/' || parsed.hostname === ''
//         ? ''
//         : `(${parsed.hostname})`;
//     title = url;
//   } catch {
//     displayedPath = url;
//   }

//   return (
//     <div title={title} data-url={url}>
//       <LhLink text={displayedPath} url={url} />
//       {displayedHost && <div>{displayedHost}</div>}
//     </div>
//   );
// };


// const Bytes = ({ value }: { value: number }) => {
//   const formattedValue = `${(value / 1024).toFixed(2)} KiB`;
//   const formattedBytes = `${value} bytes`;
//   return <div title={formattedBytes}>{formattedValue}</div>;
// };

// // Milliseconds component
// const Milliseconds = ({ value, displayUnit }: { value: number, displayUnit: string }) => {
//   // Replace with actual formatting functions
//   const formattedValue =
//     displayUnit === 'duration' ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;

//   return <div className="lh-text">{formattedValue}</div>;
// };

// // Numeric component
// const Numeric = ({ value }: { value: number }) => {
//   // Replace with actual formatting function
//   const formattedValue = value.toFixed(1);
//   return <div className="lh-numeric">{formattedValue}</div>;
// };

// // Thumbnail component
// const Thumbnail = ({ data }: {data: string}) => {
//   return <img src={data} title={data} alt="" />;
// };

// interface TimelineProps {
//   timeline?: AuditDetailFilmstrip;
//   device?: string;
// }

// // Filmstrip component
// export function Timeline({ timeline, device }: TimelineProps) {
//   const [api, setApi] = useState<CarouselApi>();
//   const [openIndex, setOpenIndex] = useState<number | null>(null);

//   useEffect(() => {
//     if (api && openIndex !== null) {
//       api.scrollTo(openIndex);
//     }
//   }, [api, openIndex]);

//   if (!timeline?.items?.length) return null;

//   return (
//     <div className="mt-3 flex flex-col">
//       <h3 className="text-lg font-bold">
//         {device ? `${device} - ` : ''} Timeline
//       </h3>
//       <Dialog>
//         <div className="mt-3 flex flex-row gap-2 align-top">
//           {timeline.items.map((item, i) => (
//             <DialogTrigger asChild key={`${i}-${item.timestamp}`}>
//               <div>
//                 <button
//                   className="rounded-md border-2 border-gray-300"
//                   onClick={() => setOpenIndex(i)}
//                 >
//                   <img alt="timeline image" width={80} src={item.data} />
//                   <div>{item.timing} ms</div>
//                 </button>
//               </div>
//             </DialogTrigger>
//           ))}
//           <DialogContent className="h-full w-screen max-w-none md:w-[74vw]">
//             <DialogTitle>Timeline</DialogTitle>
//             <Carousel setApi={setApi}>
//               <CarouselContent className="w-3/4">
//                 {timeline.items.map((item, i) => (
//                   <CarouselItem
//                     onClick={() => setTimeout(() => api?.scrollTo(i + 3), 100)}
//                     key={`${i}-${item.timestamp}`}
//                     className="basis-1/2"
//                   >
//                     <div>
//                       <img alt="timeline image" width={500} src={item.data} />
//                       <div>{item.timing} ms</div>
//                     </div>
//                   </CarouselItem>
//                 ))}
//               </CarouselContent>
//               <CarouselPrevious />
//               <CarouselNext />
//             </Carousel>
//             <DialogClose asChild>
//               <Button className="w-17" autoFocus>
//                 close
//               </Button>
//             </DialogClose>
//           </DialogContent>
//         </div>
//       </Dialog>
//     </div>
//   );
// }
// // Code component
// const Code = ({ text }: { text: string }) => {
//   return <pre className="whitespace-normal mt-0 text-xs">{text}</pre>;
// };

// type ValueType =
//   | 'bytes'
//   | 'code'
//   | 'ms'
//   | 'numeric'
//   | 'text'
//   | 'thumbnail'
//   | 'timespanMs'
//   | 'url';


// interface TableItem {
//     entity?: string;
//     subItems?: {
//       items: TableItem[];
//     };
//     [key: string]: unknown;
//   }
//   interface TableColumnHeading {
//     key?: string;
//     valueType?: ValueType;
//     label: string;
//     granularity?: number;
//     displayUnit?: string;
//   }
  

// const TableRow = ({
//   item,
//   headings,
//   isEven,
// }: {
//   item: TableItem;
//   headings: TableColumnHeading[];
//   isEven: boolean;
// }) => {
//   return (
//     <tr
//       className={isEven ? 'lh-row--even' : 'lh-row--odd'}
//       data-entity={item.entity}
//     >
//       {headings.map((heading, i) => {
//         if (!heading.key) return null;
//         const value = item[heading.key];
//         const valueType = heading.valueType || 'text';
//         const classes = `lh-table-column--${valueType}`;

//         return (
//           <td key={i} className={classes}>
//             {renderValue(value, valueType, heading)}
//           </td>
//         );
//       })}
//     </tr>
//   );
// };

// // Helper function to render different value types
// function renderValue(
//   value: any,
//   valueType: string,
//   heading: TableColumnHeading,
// ) {
//   if (value === undefined || value === null) return null;

//   switch (valueType) {
//     case 'url':
//       return <TextURL text={value} />;
//     case 'bytes':
//       return <Bytes value={value} />;
//     case 'ms':
//     case 'timespanMs':
//       return <Milliseconds value={value} displayUnit={heading.displayUnit || ''} />;
//     case 'numeric':
//       return <Numeric value={value} />;
//     case 'thumbnail':
//       return <Thumbnail data={value} />;
//     case 'code':
//       return <Code text={value} />;
//     default:
//       return <div title={String(value)}>{String(value)}</div>;
//   }
// }

// // Table component
// const Table = ({ headings, items, isEntityGrouped = false }: { headings: TableColumnHeading[], items: TableItem[], isEntityGrouped: boolean }) => {
//   if (!items.length) return <span></span>;

//   let isEven = true;

//   return (
//     <table className="lh-table">
//       <thead>
//         <tr>
//           {headings.map((heading, i) => {
//             const valueType = heading.valueType || 'text';
//             const classes = `lh-table-column--${valueType}`;

//             return (
//               <th key={i} className={classes}>
//                 <div className="lh-text">{heading.label}</div>
//               </th>
//             );
//           })}
//         </tr>
//       </thead>
//       <tbody>
//         {items.map((item, i) => {
//           // Toggle even/odd for zebra striping
//           const rowEven = isEven;
//           if (!item.subItems) {
//             isEven = !isEven;
//           }

//           return (
//             <Fragment key={i}>
//               <TableRow item={item} headings={headings} isEven={rowEven} />
//               {item.subItems?.items?.map((subItem: TableItem, j: number) => (
//                 <TableRow
//                   key={`${i}-${j}`}
//                   item={subItem}
//                   headings={headings}
//                   isEven={rowEven}
//                 />
//               ))}
//             </Fragment>
//           );
//         })}
//       </tbody>
//     </table>
//   );
// };

// // List component
// const List = ({ items }: { items: { type: any; }[] }) => {
//   return (
//     <div className="lh-list">
//       {items.map((item: any, i: any) => (
//         <DetailsRenderer key={i} type={item.type} {...item} />
//       ))}
//     </div>
//   );
// };

// // Checklist component
// const Checklist = ({ items }: { items: any }) => {
//   return (
//     <div className="lh-checklist">
//       {items.map((item: any, i: any) => (
//         <div key={i} className="lh-checklist__item">
//           <DetailsRenderer type={item.type as string} {...item} />
//         </div>
//       ))}
//     </div>
//   );
// };

// // Main DetailsRenderer component that decides which component to render based on type
// const DetailsRenderer = (props: any) => {
//   const { type, ...rest } = props;

//   switch (type) {
//     case 'list':
//       return <List {...rest} />;
//     case 'checklist':
//       return <Checklist {...rest} />;
//     case 'table':
//     case 'opportunity':
//       return <Table {...rest} />;
//     case 'criticalrequestchain':
//       // This would need a separate React component
//       return <div>Critical Request Chain (Not Implemented)</div>;
//     case 'code':
//       // @ts-ignore - assuming text is in the props
//       return <Code text={rest.text} />;
//     default:
//       return <div className="lh-unknown">Unknown type: {type}</div>;
//   }
// };
