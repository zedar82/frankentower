import type { AbilityDef, Build, Tag } from './types';
import { equipped, usable } from './body';
import { ITEM_MAP, type ItemCatalog } from './content';

export interface SetDefinition {
  id: string;
  name: string;
  tag: Tag;
  bonuses: { pieces: number; ability: AbilityDef }[];
}

export const SET_DEFINITIONS: SetDefinition[] = [
  {
    id: 'octopod',
    name: 'Octopod',
    tag: 'Octopod',
    bonuses: [
      {
        pieces: 2,
        ability: {
          id: 'octopod-2',
          name: 'Octopod · 2 pieces',
          icon: 'shoe',
          tags: ['Octopod'],
          stats: { speed: 0.1 },
        },
      },
      {
        pieces: 4,
        ability: {
          id: 'octopod-4',
          name: 'Octopod · 4 pieces',
          icon: 'shoe',
          tags: ['Octopod'],
          stats: { crit: 20 },
        },
      },
      {
        pieces: 6,
        ability: {
          id: 'octopod-6',
          name: 'Octopod · 6 pieces',
          icon: 'shoe',
          tags: ['Octopod'],
          stats: { capacity: 80 },
        },
      },
      {
        pieces: 8,
        ability: {
          id: 'octopod-8',
          name: 'Octopod · 8 pieces',
          icon: 'shoe',
          tags: ['Octopod'],
          stats: { speed: 0.5 },
        },
      },
    ],
  },
];

export function activeSets(build: Build, itemCatalog: ItemCatalog = ITEM_MAP) {
  const items = equipped(build).filter(({ item }) => usable(build, item, itemCatalog));
  return SET_DEFINITIONS.map((def) => ({
    def,
    pieces: items.filter(({ item }) => itemCatalog[item.defId].tags.includes(def.tag)).length,
  }));
}
