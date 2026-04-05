/**
 * Procedural contact identity — given + family from fixed vocab (100 each), stable per campaign seed.
 */

const GIVEN = Object.freeze(
  `Avery
Morgan
Quinn
Reese
Jordan
River
Sage
Rowan
Casey
Jamie
Ellis
Devon
Blair
Cameron
Dakota
Emerson
Finley
Gray
Harper
Indigo
Jules
Kendall
Logan
Monroe
Noel
Parker
Quinnley
Remy
Skyler
Tatum
Urban
Vesper
Winter
Xen
Yael
Zephyr
Adrian
Blake
Corey
Drew
Eden
Frankie
Gale
Hayden
Ira
Kade
Lane
Micah
Nico
Oakley
Peyton
Remi
Sloan
Tegan
Uma
Vance
Wylie
Alex
Bailey
Chris
Dana
Flynn
Imani
Kris
Max
Pat
Rory
Sam
Taylor
Val
Wren
Yuri
Zed
Ash
Brook
Cedar
Dale
Echo
Flint
Grove
Haven
Iris
Jett
Kestrel
Lynx
Marlow
Nova
Onyx
Pike
Quill
Ridge
Slate
Trace
Umber
Vale
Wisp
Xeno
Yarrow
Zinnia
Alder`
    .trim()
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);

const FAMILY = Object.freeze(
  `Vale
Ash
Cross
Reed
Frost
North
Sterling
Hollow
Brook
Field
Stone
Ridge
Marsh
Crane
Fox
Wolf
Crow
Hawk
Sparrow
Drake
Knight
Archer
Bowman
Carter
Mason
Turner
Porter
Fisher
Cooper
Weaver
Mercer
Fletcher
Harper
Singer
Barker
Forester
Gardener
Chandler
Voss
Kline
Alden
Briggs
Holloway
Whitaker
Blackwood
Greenwood
Silverthorne
Ashford
Westbrook
Eastman
Northrop
Southwick
Fairchild
Golding
Ironwood
Copperfield
Steelman
Glassbrook
Waters
Fordham
Langley
Prescott
Worthington
Harrington
Kensington
Worrell
Blackwell
Whitmore
Redfield
Bluewater
Greystone
Silverman
Goldsmith
Ironforge
Copperhill
Ashcroft
Thornfield
Moorland
Heathridge
Brookside
Clearwater
Frostwick
Snowden
Winterbourne
Summerside
Springwell
Autumnleaf
Evergreen
Fairweather
Stormcloud
Brightwell
Darkmore
Lightfoot
Quickstep
Strongbow
Trueheart
Swiftriver
Coldstream
Highfield
Lowbridge`
    .trim()
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean),
);

if (GIVEN.length !== 100 || FAMILY.length !== 100) {
  throw new Error(`contact-alias: expected 100 given + 100 family, got ${GIVEN.length}/${FAMILY.length}`);
}

/** FNV-1a — works in Node and browser without relying on node:crypto. */
function fnv1a(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * @param {string} seed
 * @returns {{ given: string, family: string, displayName: string, signoff: string, tag: string, bracket: string, handlePrompt: string }}
 */
export function resolveContactAlias(seed) {
  const h = fnv1a(String(seed ?? "default"));
  const gi = h % GIVEN.length;
  const fi = (Math.imul(h, 0x9e3779b9) >>> 0) % FAMILY.length;
  const given = GIVEN[gi] ?? "Rowan";
  const family = FAMILY[fi] ?? "Vale";
  const g0 = given[0]?.toUpperCase() ?? "?";
  const tag = `${g0}. ${family.toUpperCase()}`;
  const bracket = `${g0}.${family.slice(0, Math.min(4, family.length)).toUpperCase()}`;
  const handlePrompt = `${given[0]?.toLowerCase() ?? "x"}.${family.slice(0, 4).toLowerCase()}`;
  return {
    given,
    family,
    displayName: `${given} ${family}`,
    signoff: family,
    tag,
    bracket,
    handlePrompt,
  };
}

/**
 * @param {string} template
 * @param {ReturnType<typeof resolveContactAlias>} alias
 */
export function formatContactTemplate(template, alias) {
  return String(template)
    .replace(/\{signoff\}/g, alias.signoff)
    .replace(/\{contact\}/g, alias.displayName)
    .replace(/\{given\}/g, alias.given);
}
