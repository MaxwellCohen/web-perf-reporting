
import { LoadingMessage } from '@/components/common/LoadingMessage';
import { connection } from 'next/server';

export default async function loading() {
  await connection();
  return (<div>
    <LoadingMessage />
  </div>);
};