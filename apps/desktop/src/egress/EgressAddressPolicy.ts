import * as NodeNet from "node:net";

const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const BLOCKED_V6: ReadonlyArray<readonly [string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const staticList = new NodeNet.BlockList();

for (const [network, prefix] of BLOCKED_V4) staticList.addSubnet(network, prefix, "ipv4");

for (const [network, prefix] of BLOCKED_V6) staticList.addSubnet(network, prefix, "ipv6");

const groupsToV4 = (high: number, low: number): string =>
  `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;

/** Expands any IPv6 text form to its eight 16-bit groups, or null when it is not IPv6. */
const expandV6 = (ip: string): ReadonlyArray<number> | null => {
  if (NodeNet.isIP(ip) !== 6) return null;

  const withoutZone = ip.split("%")[0] ?? ip;

  const normalized = withoutZone.includes(".")
    ? withoutZone.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/, (_, a, b, c, d) => {
        const high = (Number(a) << 8) | Number(b);
        const low = (Number(c) << 8) | Number(d);

        return `${high.toString(16)}:${low.toString(16)}`;
      })
    : withoutZone;

  const [head = "", tail] = normalized.split("::");
  const headGroups = head === "" ? [] : head.split(":");
  const tailGroups = tail === undefined || tail === "" ? [] : tail.split(":");
  const fill = tail === undefined ? 0 : 8 - headGroups.length - tailGroups.length;
  const groups = [...headGroups, ...Array<string>(fill).fill("0"), ...tailGroups];

  return groups.map((group) => Number.parseInt(group, 16));
};

/** The IPv4 address hidden inside a mapped, NAT64, 6to4 or IPv4-compatible IPv6 address. */
const embeddedV4 = (groups: ReadonlyArray<number>): string | null => {
  const [g0 = 0, g1 = 0, g2 = 0, g3 = 0, g4 = 0, g5 = 0, g6 = 0, g7 = 0] = groups;
  const zeroThrough4 = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0;

  if (zeroThrough4 && g5 === 0xffff) return groupsToV4(g6, g7);

  if (zeroThrough4 && g5 === 0 && (g6 !== 0 || g7 > 1)) return groupsToV4(g6, g7);

  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return groupsToV4(g6, g7);
  }

  if (g0 === 0x2002) return groupsToV4(g1, g2);

  return null;
};

const interfaceList = (cidrs: ReadonlyArray<string>): NodeNet.BlockList => {
  const list = new NodeNet.BlockList();

  for (const cidr of cidrs) {
    const [address = "", prefix = ""] = cidr.split("/");
    const family = NodeNet.isIP(address);

    if (family !== 0 && prefix !== "") {
      list.addSubnet(address, Number(prefix), family === 4 ? "ipv4" : "ipv6");
    }
  }

  return list;
};

/**
 * Classifies a literal IP for egress. `interfaceCidrs` are the PC's own subnets (from
 * `os.networkInterfaces()`), blocked because home LANs hand out globally routable IPv6.
 */
export const classifyAddress = (
  ip: string,
  interfaceCidrs: ReadonlyArray<string>,
): "public" | `blocked:${string}` => {
  const family = NodeNet.isIP(ip);

  if (family === 0) return "blocked:not-an-ip";

  const groups = family === 6 ? expandV6(ip) : null;
  const embedded = groups === null ? null : embeddedV4(groups);

  if (embedded !== null) {
    const inner = classifyAddress(embedded, interfaceCidrs);

    return inner === "public" ? "public" : `blocked:embedded-${inner.slice("blocked:".length)}`;
  }

  if (staticList.check(ip, family === 4 ? "ipv4" : "ipv6")) return "blocked:reserved-range";

  if (interfaceList(interfaceCidrs).check(ip, family === 4 ? "ipv4" : "ipv6")) {
    return "blocked:local-interface-subnet";
  }

  return "public";
};
