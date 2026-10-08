import { count } from '../game/anatomy';
import { ITEM_MAP } from '../game/content';
import type { Build } from '../game/types';
import { Icon } from './Icon';
export function Creature({ build, enemy = false, active = false, hurt = false, compact = false }: { build: Build; enemy?: boolean; active?: boolean; hurt?: boolean; compact?: boolean }) {
  const heads = count(build, 'head'), hands = count(build, 'hand'), feet = count(build, 'foot'), hearts = count(build, 'heart');
  const skin = enemy ? '#afa590' : '#a7b791', shade = enemy ? '#706759' : '#6a8067', ink = '#26392e';
  const handParts = build.parts.filter(p => p.slot === 'hand'), headParts = build.parts.filter(p => p.slot === 'head'), footParts = build.parts.filter(p => p.slot === 'foot');
  return <svg viewBox="0 0 260 270" role="img" aria-label={`${build.name}: ${heads} heads, ${hands} hands, ${feet} feet, ${hearts} hearts`} className={`creature ${active ? 'acting' : ''} ${hurt ? 'hurt' : ''} ${compact ? 'compact' : ''}`}>
    <ellipse cx="130" cy="250" rx={52 + Math.min(38, feet * 4)} ry="9" fill="#000" opacity=".22"/>
    <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      {footParts.map((part, i) => {
        const x = 130 + (i - (feet - 1) / 2) * Math.min(29, 160 / Math.max(1, feet));
        return <g key={part.uid}><path d={`M${118 + (i % 2) * 24} 176 Q${x} 203 ${x} 239`} fill="none" stroke={shade} strokeWidth="16"/><path d={`M${x-7} 232v12h${i % 2 ? 20 : -20}v-7Z`} fill={part.item ? '#796548' : skin}/><path d={`M${x-8} 207h16m-8-7v14`} strokeWidth="1"/></g>;
      })}
      {handParts.map((part, i) => {
        const left = i % 2 === 0, tier = Math.floor(i / 2), sx = left ? 101 : 159, sy = 114 + tier * 10, x = left ? Math.max(14, 62-tier*14) : Math.min(246, 198+tier*14), y = 150 - tier * 22;
        return <g key={part.uid}><path d={`M${sx} ${sy}Q${x} ${sy-12} ${x} ${y}`} fill="none" stroke={part.variant === 'clockwork' ? '#ad9870' : skin} strokeWidth="14"/><circle cx={x} cy={y} r="9" fill={skin}/><path d={`M${sx + (left ? -9 : 9)} ${sy-6}l-4 13m-3-14-4 12`} strokeWidth="1"/>{part.item && <g transform={`translate(${x-14},${y-22}) rotate(${left ? -25 : 25},14,14)`} color="#d6b878"><Icon name={ITEM_MAP[part.item.defId]?.icon} size={28}/></g>}</g>;
      })}
      <path d="M110 94h40l15 34-8 53q-27 14-54 0l-8-53Z" fill={skin}/>
      <path d="M105 133q25 10 50 0m-47 40 45 1M127 103l6 76m-9-65 13-1m-12 14 12-1m-11 14h13m-12 13 12-1" fill="none" strokeWidth="1.3"/>
      {Array.from({ length: Math.min(6, hearts) }, (_, i) => <path key={i} d={`M${111 + i%3*15} ${142+Math.floor(i/3)*16}c-8-8-10 5 0 10 10-5 8-18 0-10Z`} fill="#a75d4c" strokeWidth="1"/>)}
      {headParts.map((part, i) => {
        const x = 130 + (i - (heads - 1) / 2) * Math.min(44, 180 / heads), y = 72 + Math.abs(i - (heads-1)/2)*8;
        return <g key={part.uid}><path d={`M${x} 106V${y+17}`} stroke={shade} strokeWidth="12"/><rect x={x-18} y={y-21} width="36" height="43" rx={part.variant === 'serpent' ? 17 : 9} fill={skin}/><path d={`M${x-16} ${y-11}h32m-23-4v8m7-8v8m7-8v8`} strokeWidth="1"/><path d={`M${x-11} ${y+1}h5m12 0h5M${x-7} ${y+13}h14`} strokeWidth="2"/>{part.item && <g transform={`translate(${x-17},${y-37})`} color="#d6b878"><Icon name={ITEM_MAP[part.item.defId]?.icon} size={34}/></g>}<path d={`M${x-22} ${y-6}h-6m50 0h6`} stroke="#a2a597" strokeWidth="4"/></g>;
      })}
    </g>
  </svg>;
}
