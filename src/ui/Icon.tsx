import type { CSSProperties } from 'react';
export function Icon({ name, size = 28, className = '', style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const paths: Record<string, React.ReactNode> = {
    dagger: <><path d="m9 23 13-19 3 3-13 19Z" fill="currentColor"/><path d="m6 22 10 6M8 27l-3 4"/></>,
    knife: <><path d="M11 24 13 5h13l-9 20Z" fill="currentColor"/><path d="m12 24-4 8M8 23l11 4"/></>,
    club: <><path d="m8 29 10-14"/><path d="m14 12 6-8 8 6-6 9Z" fill="currentColor"/><path d="m17 6 8 9"/></>,
    shield: <><path d="M7 7 18 3l11 4v12c-2 7-11 12-11 12S9 26 7 19Z" fill="currentColor" fillOpacity=".18"/><path d="M18 4v26M8 13h20"/></>,
    armour: <><path d="m6 9 7-6 5 4 5-4 7 6-4 7v14H10V16Z" fill="currentColor" fillOpacity=".18"/><path d="M18 8v22M10 18h16"/></>,
    helmet: <><path d="M8 25V15C8 2 28 2 28 15v10ZM6 25h24M12 13l4 3m8-3-4 3M18 15v10"/><path d="M8 13 3 5l9 3m16 5 5-8-9 3" fill="currentColor" fillOpacity=".3"/></>,
    hood: <><path d="m5 28 7-17 3-7h6l5 7 5 17Z" fill="currentColor" fillOpacity=".2"/><path d="M11 20c0-13 14-13 14 0v8H11Z"/><path d="m15 19 2 2m5-2-2 2"/></>,
    shoe: <><path d="M10 5h12v14l9 6v6H5V19h5Z" fill="currentColor" fillOpacity=".2"/><path d="M5 26h26M11 10h10m-10 5h10m1 6-5 3"/></>,
    heart: <><path d="M18 29C4 20 3 9 10 7c5-2 8 4 8 4s3-6 8-4c7 2 6 13-8 22Z" fill="currentColor" fillOpacity=".3"/><path d="m18 11 1-8 6-1M7 17h7l3-5 3 10 3-5h6"/></>,
    wand: <><path d="m7 31 15-19M23 2v5m6 2 5 2m-6 7 3 4M17 5l-3-3"/><path d="m23 7 3 4-2 5-5-2-1-4Z" fill="currentColor"/></>,
    bow: <><path d="M12 4c22 8 22 20 0 28L12 4Z"/><path d="M4 18h26m-5-4 5 4-5 4"/></>,
    dice: <><rect x="5" y="5" width="26" height="26" rx="5" fill="currentColor" fillOpacity=".2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="24" cy="24" r="1.5" fill="currentColor"/><circle cx="18" cy="18" r="1.5" fill="currentColor"/><circle cx="12" cy="24" r="1.5" fill="currentColor"/><circle cx="24" cy="12" r="1.5" fill="currentColor"/></>,
    hand: <><path d="M10 30 5 17l4-2 4 7V6h4v12-15h4v15-12h4v14-10h4v14l-6 7Z" fill="currentColor" fillOpacity=".13"/></>,
    head: <><path d="M25 29H12v-8l-5-2 4-4V9c0-9 18-9 18 3 0 5-4 9-4 9Z" fill="currentColor" fillOpacity=".13"/><path d="M14 12h3m-4 9h5"/></>,
    foot: <><path d="M14 4h10v16l7 5v5H5v-5l9-7Z" fill="currentColor" fillOpacity=".13"/></>,
    chest: <><path d="m8 4 10 4 10-4 4 9-6 5v13H10V18l-6-5Z" fill="currentColor" fillOpacity=".13"/><path d="M18 8v23M11 16h14"/></>,
    gold: <><path d="m18 3 12 15-12 15L6 18Z" fill="currentColor" fillOpacity=".2"/><path d="m18 8 8 10-8 10-8-10Z"/></>,
    stairs: <path d="M4 29h8v-8h8v-8h8V5h5M4 33h29"/>,
    surgery: <><path d="m7 29 21-21M23 3l10 10M3 25l8 8M9 7l4 4M7 9l4 4"/><circle cx="9" cy="9" r="5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>{paths[name] ?? paths.heart}</svg>;
}
