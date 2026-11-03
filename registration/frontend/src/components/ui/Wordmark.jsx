import wordmark from '@/assets/wordmark.svg';
import { SITE_NAME } from '@/lib/site';

export default function Wordmark({ className = '' }) {
  return <img src={wordmark} alt={SITE_NAME} draggable="false" className={`block h-auto w-full max-w-[314px] select-none sm:max-w-[419px] ${className}`} />;
}
