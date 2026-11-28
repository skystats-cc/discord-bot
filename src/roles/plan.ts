export interface RoleIds {
  linked: string;
  pro: string;
  max: string;
}
export interface Wanted {
  discordId: string;
  linked: boolean;
  tier: 'free' | 'pro' | 'max';
}

/** Which roles one member should have. Pure, so it's easy to test. */
export function rolesFor(w: Wanted | undefined, ids: RoleIds): Set<string> {
  const out = new Set<string>();
  if (!w) return out;
  if (w.linked && ids.linked) out.add(ids.linked);
  if (w.tier === 'pro' && ids.pro) out.add(ids.pro);
  if (w.tier === 'max' && ids.max) out.add(ids.max);
  return out;
}

/** Adds and removes needed for one member, touching only roles we manage. */
export function diffRoles(current: Iterable<string>, wanted: Set<string>, ids: RoleIds) {
  const managed = new Set([ids.linked, ids.pro, ids.max].filter(Boolean));
  const have = new Set([...current].filter((r) => managed.has(r)));
  return { add: [...wanted].filter((r) => !have.has(r)), remove: [...have].filter((r) => !wanted.has(r)) };
}
