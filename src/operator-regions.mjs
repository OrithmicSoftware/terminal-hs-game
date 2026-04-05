/**
 * Operator uplink regions — shared by browser intro and Node CLI setup.
 */
export const REGIONS = [
  { id: "NORD-ICE", name: "Arctic relay", flavor: "Low noise floor; long RTT." },
  { id: "PAC-RIM", name: "Pacific corridor", flavor: "Dense peering; watch trace." },
  { id: "EUR-MID", name: "Central EU mesh", flavor: "Regulatory ghosts in-line." },
  { id: "ATL-SHO", name: "Atlantic shore", flavor: "Legacy finance uplinks." },
  { id: "SUB-SAH", name: "Sub-Saharan hop", flavor: "High jitter; resilient paths." },
  { id: "ANZ-SEA", name: "APAC edge", flavor: "Sunrise shifts; fast rotations." },
];

/** Browser survey + CLI: first region and default codename (Enter = accept). */
export const DEFAULT_OPERATOR_REGION_ID = REGIONS[0].id;
export const DEFAULT_OPERATOR_CODENAME = "Operator";
