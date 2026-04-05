function buildMission(index) {
  const labels = ["mirage", "relay", "shard", "vault", "vector", "cipher"];
  const codename = labels[index % labels.length];
  const id = `pg-${String(index + 1).padStart(3, "0")}-${codename}`;

  const n1 = `gw-${codename}`;
  const n2 = `api-${codename}`;
  const n3 = `db-${codename}`;
  const targetFile = `/data/${codename}_ledger.csv`;

  const sshV = [
    "CVE-2024-6387 class (regreSSHion — OpenSSH RCE surface)",
    "CVE-2023-48795 class (Terrapin — channel downgrade risk)",
  ];
  const httpV = [
    "SSTI / template RCE class (cf. CVE-2022-26134 OGNL-style chains)",
    "Deserialization gadget class (cf. unsafe JSON/YAML parsers)",
  ];
  const pgV = [
    "CVE-2019-9193 class (COPY FROM PROGRAM — superuser misconfig)",
    "Overprivileged COPY / file read class (misconfig-copy)",
  ];

  return {
    id,
    title: `Procedural File ${index + 1}: ${codename.toUpperCase()}`,
    brief: `Port-sweep ${n1} → ${n2} → exfil from ${n3} (CVE-class labels).`,
    startNode: "local",
    security: { maxTrace: 34 + (index % 3) * 2 },
    objective: {
      summary: `Exfiltrate ${targetFile} from ${n3}, then submit.`,
      requiredNode: n3,
      exfilFiles: [targetFile],
    },
    edges: [
      ["local", n1],
      [n1, n2],
      [n2, n3],
    ],
    nodes: [
      {
        id: "local",
        services: [],
        noise: { enum: 0 },
        files: [],
      },
      {
        id: n1,
        services: [
          {
            name: "ssh",
            protocol: "tcp",
            port: 22,
            exploitId: `ssh-${codename}`,
            noise: 4,
            vulnRef: sshV[index % sshV.length],
          },
        ],
        noise: { enum: 2 },
        files: [{ path: "/etc/hints.txt", content: `upstream=${n2}` }],
      },
      {
        id: n2,
        services: [
          {
            name: "http",
            protocol: "tcp",
            port: 8080,
            exploitId: `rce-${codename}`,
            noise: 5,
            vulnRef: httpV[index % httpV.length],
          },
        ],
        noise: { enum: 3 },
        files: [{ path: "/opt/app/.env", content: `DB_HOST=${n3}` }],
      },
      {
        id: n3,
        services: [
          {
            name: "postgres",
            protocol: "tcp",
            port: 5432,
            exploitId: `db-${codename}`,
            noise: 6,
            vulnRef: pgV[index % pgV.length],
          },
        ],
        noise: { enum: 4 },
        files: [
          { path: targetFile, content: `account,delta\nX-${index + 10},42700\nX-${index + 11},99100` },
          { path: "/data/readme.txt", content: "archive node: internal only" },
        ],
      },
    ],
  };
}

export function generateProceduralMissions(count = 4) {
  const missions = [];
  for (let i = 0; i < count; i += 1) missions.push(buildMission(i));
  return missions;
}
