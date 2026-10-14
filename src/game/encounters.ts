import { stats } from './anatomy';
import { CHECKPOINT_ENEMY_PROFILES, ENEMY_PROFILES, ENEMY_PROFILE_BY_ID } from './content/enemies';
import { Random } from './random';
import { RULESET, clone, type Build, type Legacy } from './types';

function buildFromProfile(profileId: string, floor?: number): Build {
  const profile = ENEMY_PROFILE_BY_ID[profileId];
  if (!profile) throw new Error(`Unknown enemy profile: ${profileId}`);
  const build: Build = {
    name: profile.name,
    enemyProfileId: profile.id,
    parts: profile.anatomy.slots.map((slot, index) => ({
      uid: `${profile.anatomy.partUidPrefix}-${index}`,
      slot,
      variant: profile.anatomy.material,
    })),
  };

  build.healthFactor =
    profile.healthFactor ??
    (profile.baseHp * (floor === undefined ? 1 : 1 + floor * 0.025)) / stats(build).maxHp;
  build.powerFactor = profile.power * (floor === undefined ? 1 : 1 + floor * 0.009);

  for (const item of profile.equipment) {
    const part = build.parts.find((part) => part.slot === item.slot && !part.item);
    if (!part)
      throw new Error(
        `Enemy profile ${profile.id} has no free ${item.slot} slot for ${item.defId}.`,
      );
    part.item = { uid: item.uid, defId: item.defId, level: item.level };
  }
  return build;
}

export function encounter(floor: number, seed: number, legacy: Legacy[]): Build[] {
  if (floor % 20 === 0) {
    const old = legacy.find((build) => build.checkpoint === floor && build.ruleset === RULESET);
    if (old) return [clone(old.build)];
    const profile = CHECKPOINT_ENEMY_PROFILES.find(
      (candidate) => candidate.id === `checkpoint-${floor}`,
    );
    return profile ? [buildFromProfile(profile.id)] : [];
  }

  const rng = new Random((seed ^ Math.imul(floor, 2654435761)) >>> 0);
  if (floor === 1) return [buildFromProfile('skeleton')];
  let budget = 4 + Math.floor(floor / 7);
  const result: Build[] = [];
  while (budget >= 2 && result.length < 6) {
    const pool = ENEMY_PROFILES.filter(
      (profile) => profile.cost <= budget && (floor >= 8 || profile.cost <= 4),
    );
    const profile = rng.pick(pool);
    budget -= profile.cost;
    result.push(buildFromProfile(profile.id, floor));
  }
  return result;
}
