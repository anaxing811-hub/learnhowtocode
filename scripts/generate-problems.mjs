#!/usr/bin/env node
/**
 * Generates content/problems/*.tests.json from reference solutions.
 *
 * Test data is *computed*, never typed by hand: each problem below carries a
 * JavaScript reference implementation, and the expected output for every case
 * is whatever that reference produces. A hand-written expected output is a
 * guess; this is a proof that the answer is self-consistent.
 *
 * Every statement and every test case here is original work written for this
 * site. Difficulty tiers are calibrated against USACO divisions, but no
 * problem is copied from USACO or any other contest — their statements and
 * test data are not licensed for reuse.
 *
 * Run:  node scripts/generate-problems.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "content", "problems");
fs.mkdirSync(outDir, { recursive: true });

/** Deterministic PRNG so regenerating never churns the test files. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const randInt = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/* ================================================================== */
/* Problem definitions                                                 */
/* ================================================================== */

const problems = [];

function defineProblem(spec) {
  problems.push(spec);
}

/* ---------------------------- Warm-up ---------------------------- */

defineProblem({
  id: "twin-totals",
  title: "Twin Totals",
  tier: "warmup",
  order: 1,
  topics: ["input", "arithmetic"],
  timeLimitMs: 1000,
  statement: `Farm equipment comes in pairs, and the barn inventory sheet lists the two counts on one line.

Read two integers \`a\` and \`b\` and print three numbers on one line, separated by single spaces: their sum, their difference \`a - b\`, and their product.

## Input

One line containing two integers \`a\` and \`b\` ( \`-10^9 <= a, b <= 10^9\` ).

## Output

One line: \`a + b\`, \`a - b\`, and \`a * b\`, separated by single spaces.`,
  hints: [
    "Reading two numbers is `std::cin >> a >> b;` in C++ and `a, b = map(int, input().split())` in Python.",
    "The product of two numbers near 10^9 does not fit in a 32-bit `int`. In C++ use `long long`.",
  ],
  starter: {
    cpp: `#include <iostream>

int main() {
    long long a, b;
    std::cin >> a >> b;
    // Print a+b, a-b and a*b separated by spaces.
    return 0;
}`,
    python: `a, b = map(int, input().split())
# Print a+b, a-b and a*b separated by spaces.`,
  },
  solve: (input) => {
    const [a, b] = input.trim().split(/\s+/).map(BigInt);
    return `${a + b} ${a - b} ${a * b}`;
  },
  cases: () => {
    const rand = rng(11);
    const cases = [
      { input: "3 4", sample: true },
      { input: "-5 12", sample: true },
      { input: "0 0" },
      { input: "1000000000 1000000000" },
      { input: "-1000000000 1000000000" },
      { input: "-1000000000 -1000000000" },
      { input: "7 -7" },
    ];
    for (let i = 0; i < 8; i++) {
      cases.push({
        input: `${randInt(rand, -1e9, 1e9)} ${randInt(rand, -1e9, 1e9)}`,
      });
    }
    return cases;
  },
});

defineProblem({
  id: "counting-sheep",
  title: "Counting Sheep",
  tier: "warmup",
  order: 2,
  topics: ["loops", "conditionals"],
  timeLimitMs: 1000,
  statement: `Every sheep in the flock has a wool weight recorded in whole kilograms.

A sheep is **ready for shearing** if its wool weight is strictly greater than a threshold \`t\`.

Count how many sheep are ready, and also report the total wool weight of exactly those sheep.

## Input

The first line contains two integers \`n\` and \`t\` ( \`1 <= n <= 100000\`, \`0 <= t <= 1000\` ).
The second line contains \`n\` integers \`w_1 … w_n\` ( \`0 <= w_i <= 1000\` ).

## Output

One line with two integers: the number of sheep ready for shearing, and their combined wool weight. If no sheep qualifies, print \`0 0\`.`,
  hints: [
    "One pass is enough — keep a counter and a running total in the same loop.",
    "Watch the boundary: 'strictly greater' means a sheep with weight exactly `t` does not count.",
    "The total can reach 100000 × 1000 = 10^8, which still fits in a 32-bit int, but `long long` costs nothing.",
  ],
  starter: {
    cpp: `#include <iostream>

int main() {
    int n, t;
    std::cin >> n >> t;
    // Read n weights; count and sum the ones strictly greater than t.
    return 0;
}`,
    python: `import sys

data = sys.stdin.read().split()
n, t = int(data[0]), int(data[1])
weights = list(map(int, data[2:2 + n]))
# Count and sum the weights strictly greater than t.`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const [n, t] = nums;
    const weights = nums.slice(2, 2 + n);
    let count = 0;
    let total = 0;
    for (const w of weights) {
      if (w > t) {
        count++;
        total += w;
      }
    }
    return `${count} ${total}`;
  },
  cases: () => {
    const rand = rng(23);
    const cases = [
      { input: "5 10\n4 11 10 25 9", sample: true },
      { input: "3 0\n0 0 0", sample: true },
      { input: "1 1000\n1000" },
      { input: "1 999\n1000" },
    ];
    for (const n of [10, 100, 1000, 5000, 20000]) {
      const weights = Array.from({ length: n }, () => randInt(rand, 0, 1000));
      cases.push({ input: `${n} ${randInt(rand, 0, 1000)}\n${weights.join(" ")}` });
    }
    return cases;
  },
});

/* ---------------------------- Bronze ----------------------------- */

defineProblem({
  id: "stacking-crates",
  title: "Stacking Crates",
  tier: "bronze",
  order: 1,
  topics: ["sorting", "greedy"],
  timeLimitMs: 2000,
  statement: `You have \`n\` crates. Crate \`i\` has width \`w_i\` and can support a total weight of \`s_i\` on top of it. Every crate weighs exactly 1 unit.

You want to build a single vertical stack using **as many crates as possible**. A stack is valid if, for every crate in it, the number of crates above it is at most that crate's support value \`s_i\`.

The widths are a red herring; they are recorded on the inventory sheet but do not constrain the stack.

Print the largest number of crates that can appear in a valid stack.

## Input

The first line contains \`n\` ( \`1 <= n <= 200000\` ).
Each of the next \`n\` lines contains two integers \`w_i\` and \`s_i\` ( \`1 <= w_i <= 10^9\`, \`0 <= s_i <= 200000\` ).

## Output

A single integer: the maximum stack size.`,
  hints: [
    "The widths genuinely do not matter. Convince yourself of that before going further.",
    "If you decide to use a set of crates, you should place the ones with the smallest support values nearest the top.",
    "Sort by support value ascending, then walk the list keeping a count: a crate can join the stack if its support is at least the number of crates already placed above it.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    std::cin >> n;
    std::vector<int> support(n);
    for (int i = 0; i < n; ++i) {
        int w, s;
        std::cin >> w >> s;
        support[i] = s;
    }
    // Sort, then greedily grow the stack.
    return 0;
}`,
    python: `import sys

data = sys.stdin.buffer.read().split()
n = int(data[0])
support = [int(data[2 + 2 * i]) for i in range(n)]
# Sort, then greedily grow the stack.`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const n = nums[0];
    const support = [];
    for (let i = 0; i < n; i++) support.push(nums[2 + 2 * i]);
    support.sort((a, b) => a - b);
    let placed = 0;
    for (const s of support) if (s >= placed) placed++;
    return String(placed);
  },
  cases: () => {
    const rand = rng(37);
    const cases = [
      { input: "3\n5 0\n4 1\n7 2", sample: true },
      { input: "4\n1 0\n1 0\n1 0\n1 0", sample: true },
      { input: "1\n9 0" },
      { input: "1\n9 200000" },
    ];
    for (const n of [10, 500, 5000, 40000]) {
      const lines = [String(n)];
      for (let i = 0; i < n; i++) {
        lines.push(`${randInt(rand, 1, 1e9)} ${randInt(rand, 0, Math.min(n, 200000))}`);
      }
      cases.push({ input: lines.join("\n") });
    }
    // Everything supports everything: the answer is n.
    const big = 20000;
    cases.push({
      input: [String(big), ...Array.from({ length: big }, () => "1 200000")].join("\n"),
    });
    return cases;
  },
});

defineProblem({
  id: "fence-shadows",
  title: "Fence Shadows",
  tier: "bronze",
  order: 2,
  topics: ["intervals", "sorting"],
  timeLimitMs: 2000,
  statement: `A long fence runs along a number line. \`n\` posts each cast a shadow covering a closed interval \`[l_i, r_i]\`.

Report two numbers: the total length of fence covered by at least one shadow, and the length covered by **two or more** shadows.

## Input

The first line contains \`n\` ( \`1 <= n <= 100000\` ).
Each of the next \`n\` lines contains \`l_i\` and \`r_i\` ( \`0 <= l_i < r_i <= 10^9\` ).

## Output

Two integers on one line: the length covered at least once, and the length covered at least twice.`,
  hints: [
    "Sorting the intervals by left endpoint makes the structure obvious.",
    "Sweep through the sorted intervals tracking the furthest right edge seen so far. Overlap is the part of a new interval that starts before that edge.",
    "Careful with an interval entirely swallowed by a previous one — its whole length is overlap, and it must not extend your running right edge.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n;
    std::cin >> n;
    std::vector<std::pair<long long, long long>> shadows(n);
    for (auto& s : shadows) std::cin >> s.first >> s.second;
    std::sort(shadows.begin(), shadows.end());
    // Sweep left to right.
    return 0;
}`,
    python: `import sys

data = sys.stdin.buffer.read().split()
n = int(data[0])
shadows = sorted(
    (int(data[1 + 2 * i]), int(data[2 + 2 * i])) for i in range(n)
)
# Sweep left to right.`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const n = nums[0];
    const intervals = [];
    for (let i = 0; i < n; i++) {
      intervals.push([nums[1 + 2 * i], nums[2 + 2 * i]]);
    }
    intervals.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    let once = 0;
    let twice = 0;
    let curL = intervals[0][0];
    let curR = intervals[0][1];
    // `reach` is the furthest right edge seen, used for double coverage.
    let reach = intervals[0][1];

    for (let i = 1; i < n; i++) {
      const [l, r] = intervals[i];
      if (l < reach) twice += Math.min(r, reach) - l;
      reach = Math.max(reach, r);

      if (l > curR) {
        once += curR - curL;
        curL = l;
        curR = r;
      } else {
        curR = Math.max(curR, r);
      }
    }
    once += curR - curL;
    return `${once} ${twice}`;
  },
  cases: () => {
    const rand = rng(53);
    const cases = [
      { input: "3\n1 5\n3 8\n10 12", sample: true },
      { input: "2\n0 10\n2 4", sample: true },
      { input: "1\n0 1000000000" },
      { input: "2\n0 5\n5 10" },
      { input: "3\n0 4\n0 4\n0 4" },
    ];
    for (const n of [50, 2000, 25000]) {
      const lines = [String(n)];
      for (let i = 0; i < n; i++) {
        const l = randInt(rand, 0, 999999998);
        const r = Math.min(1e9, l + randInt(rand, 1, 100000));
        lines.push(`${l} ${r}`);
      }
      cases.push({ input: lines.join("\n") });
    }
    // Dense overlapping cluster, where double coverage dominates.
    const dense = ["3000"];
    for (let i = 0; i < 3000; i++) {
      const l = randInt(rand, 0, 5000);
      dense.push(`${l} ${l + randInt(rand, 1, 3000)}`);
    }
    cases.push({ input: dense.join("\n") });
    return cases;
  },
});

/* ---------------------------- Silver ----------------------------- */

defineProblem({
  id: "water-rationing",
  title: "Water Rationing",
  tier: "silver",
  order: 1,
  topics: ["binary search on answer", "greedy"],
  timeLimitMs: 2000,
  statement: `There are \`n\` water tanks in a row, tank \`i\` holding \`a_i\` litres. You must hand out the water to \`k\` families.

Each family receives water from **one contiguous run of tanks**, the runs must not overlap, every tank must be given to exactly one family, and every family must receive at least one tank.

The **strain** on a family is the total litres it has to carry. Choose the split that makes the largest strain as small as possible, and print that value.

## Input

The first line contains \`n\` and \`k\` ( \`1 <= k <= n <= 200000\` ).
The second line contains \`n\` integers \`a_i\` ( \`1 <= a_i <= 10^9\` ).

## Output

A single integer: the smallest possible value of the largest family's strain.`,
  hints: [
    "You are being asked to minimise a maximum. That phrasing is almost always a binary search on the answer.",
    "For a candidate strain `X`, greedily fill one family until adding the next tank would exceed `X`, then start a new family. Count how many families that needs.",
    "If the greedy count is at most `k`, then `X` is achievable, so search lower. The lower bound of the search is the largest single tank; the upper bound is the total.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    int n, k;
    std::cin >> n >> k;
    std::vector<long long> a(n);
    for (auto& x : a) std::cin >> x;
    // Binary search the answer between max(a) and sum(a).
    return 0;
}`,
    python: `import sys

data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
# Binary search the answer between max(a) and sum(a).`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const [n, k] = nums;
    const a = nums.slice(2, 2 + n);

    let lo = 0;
    let hi = 0;
    for (const x of a) {
      lo = Math.max(lo, x);
      hi += x;
    }

    const families = (limit) => {
      let count = 1;
      let load = 0;
      for (const x of a) {
        if (load + x > limit) {
          count++;
          load = x;
        } else {
          load += x;
        }
      }
      return count;
    };

    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (families(mid) <= k) hi = mid;
      else lo = mid + 1;
    }
    return String(lo);
  },
  cases: () => {
    const rand = rng(71);
    const cases = [
      { input: "5 2\n1 2 3 4 5", sample: true },
      { input: "4 4\n7 7 7 7", sample: true },
      { input: "1 1\n1000000000" },
      { input: "6 1\n1 1 1 1 1 1" },
      { input: "6 6\n5 4 3 2 1 9" },
    ];
    for (const [n, k] of [
      [50, 7],
      [1000, 13],
      [20000, 999],
      [40000, 2],
      [40000, 40000],
    ]) {
      const a = Array.from({ length: n }, () => randInt(rand, 1, 1e9));
      cases.push({ input: `${n} ${k}\n${a.join(" ")}` });
    }
    return cases;
  },
});

defineProblem({
  id: "pasture-islands",
  title: "Pasture Islands",
  tier: "silver",
  order: 2,
  topics: ["graph traversal", "flood fill"],
  timeLimitMs: 2000,
  statement: `A rectangular pasture is given as a grid of \`.\` (grass) and \`#\` (water). Grass cells are connected if they touch **edge to edge** — diagonals do not count.

A *field* is a maximal connected group of grass cells.

Print the number of fields and the size of the largest one. If there is no grass at all, print \`0 0\`.

## Input

The first line contains \`r\` and \`c\` ( \`1 <= r, c <= 1000\` ).
Each of the next \`r\` lines contains \`c\` characters, each \`.\` or \`#\`.

## Output

Two integers: the number of fields and the size of the largest field.`,
  hints: [
    "This is flood fill. Walk every cell; when you find unvisited grass, explore everything reachable from it and count as you go.",
    "A recursive depth-first search can blow the stack on a 1000×1000 grid that is entirely grass. Use an explicit stack or a queue.",
    "Reading the grid line by line and indexing `grid[row][col]` is easier to get right than a single flat string.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>
#include <string>

int main() {
    int r, c;
    std::cin >> r >> c;
    std::vector<std::string> grid(r);
    for (auto& row : grid) std::cin >> row;
    // Flood fill each unvisited grass cell.
    return 0;
}`,
    python: `import sys

data = sys.stdin.read().split()
r, c = int(data[0]), int(data[1])
grid = data[2:2 + r]
# Flood fill each unvisited grass cell.`,
  },
  solve: (input) => {
    const tokens = input.trim().split(/\s+/);
    const r = Number(tokens[0]);
    const c = Number(tokens[1]);
    const grid = tokens.slice(2, 2 + r);

    const seen = new Uint8Array(r * c);
    let fields = 0;
    let largest = 0;

    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (grid[i][j] !== "." || seen[i * c + j]) continue;
        fields++;
        let size = 0;
        const stack = [i * c + j];
        seen[i * c + j] = 1;
        while (stack.length) {
          const cur = stack.pop();
          const ci = Math.floor(cur / c);
          const cj = cur % c;
          size++;
          const neighbours = [
            [ci - 1, cj],
            [ci + 1, cj],
            [ci, cj - 1],
            [ci, cj + 1],
          ];
          for (const [ni, nj] of neighbours) {
            if (ni < 0 || nj < 0 || ni >= r || nj >= c) continue;
            const idx = ni * c + nj;
            if (seen[idx] || grid[ni][nj] !== ".") continue;
            seen[idx] = 1;
            stack.push(idx);
          }
        }
        largest = Math.max(largest, size);
      }
    }
    return `${fields} ${largest}`;
  },
  cases: () => {
    const rand = rng(97);
    const cases = [
      { input: "3 4\n..#.\n.##.\n....", sample: true },
      { input: "2 2\n##\n##", sample: true },
      { input: "1 1\n." },
      { input: "1 1\n#" },
    ];
    const build = (r, c, density) => {
      const rows = [];
      for (let i = 0; i < r; i++) {
        let row = "";
        for (let j = 0; j < c; j++) row += rand() < density ? "#" : ".";
        rows.push(row);
      }
      return `${r} ${c}\n${rows.join("\n")}`;
    };
    cases.push({ input: build(10, 10, 0.3) });
    cases.push({ input: build(100, 100, 0.45) });
    cases.push({ input: build(250, 250, 0.5) });
    // All grass: one enormous field, the case that breaks recursive DFS.
    cases.push({
      input: `400 400\n${Array.from({ length: 400 }, () => ".".repeat(400)).join("\n")}`,
    });
    // Checkerboard: every grass cell is its own field.
    const checker = [];
    for (let i = 0; i < 150; i++) {
      let row = "";
      for (let j = 0; j < 150; j++) row += (i + j) % 2 === 0 ? "." : "#";
      checker.push(row);
    }
    cases.push({ input: `150 150\n${checker.join("\n")}` });
    return cases;
  },
});

/* ----------------------------- Gold ------------------------------ */

defineProblem({
  id: "silo-combinations",
  title: "Silo Combinations",
  tier: "gold",
  order: 1,
  topics: ["dynamic programming", "counting"],
  timeLimitMs: 2000,
  statement: `A silo is filled using scoops of \`n\` distinct sizes. You have an unlimited supply of every size.

Count the number of ways to fill a silo of capacity exactly \`x\`, where **the order of scoops does not matter** — using a 2-scoop then a 3-scoop is the same as a 3-scoop then a 2-scoop.

Because the count can be enormous, print it modulo \`1000000007\`.

## Input

The first line contains \`n\` and \`x\` ( \`1 <= n <= 100\`, \`1 <= x <= 100000\` ).
The second line contains \`n\` distinct integers \`c_i\` ( \`1 <= c_i <= x\` ).

## Output

The number of unordered ways to reach exactly \`x\`, modulo \`1000000007\`.`,
  hints: [
    "Start with the ordered version: `ways[v] = sum over coins of ways[v - c]`. Then ask why that overcounts here.",
    "To count combinations rather than permutations, fix an order on the coins: loop over coins in the outer loop and capacities in the inner loop. Each coin is then only ever added after the ones before it.",
    "Swapping the two loops is exactly the difference between counting permutations and counting combinations. That is the whole problem.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>

int main() {
    int n, x;
    std::cin >> n >> x;
    std::vector<int> coins(n);
    for (auto& c : coins) std::cin >> c;

    const long long MOD = 1000000007;
    std::vector<long long> ways(x + 1, 0);
    ways[0] = 1;
    // Outer loop over coins, inner loop over capacities.
    return 0;
}`,
    python: `import sys

data = sys.stdin.read().split()
n, x = int(data[0]), int(data[1])
coins = list(map(int, data[2:2 + n]))

MOD = 1000000007
ways = [0] * (x + 1)
ways[0] = 1
# Outer loop over coins, inner loop over capacities.`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const [n, x] = nums;
    const coins = nums.slice(2, 2 + n);
    const MOD = 1000000007n;
    const ways = new Array(x + 1).fill(0n);
    ways[0] = 1n;
    for (const c of coins) {
      for (let v = c; v <= x; v++) {
        ways[v] = (ways[v] + ways[v - c]) % MOD;
      }
    }
    return String(ways[x]);
  },
  cases: () => {
    const rand = rng(131);
    const cases = [
      { input: "3 9\n2 3 5", sample: true },
      { input: "2 5\n1 5", sample: true },
      { input: "1 1\n1" },
      { input: "1 100000\n7" },
      { input: "1 99999\n100000".replace("100000", "99999") },
    ];
    const distinct = (count, max) => {
      const set = new Set();
      while (set.size < count) set.add(randInt(rand, 1, max));
      return [...set];
    };
    for (const [n, x] of [
      [10, 500],
      [50, 5000],
      [100, 100000],
      [100, 99991],
    ]) {
      const coins = distinct(n, x);
      cases.push({ input: `${n} ${x}\n${coins.join(" ")}` });
    }
    // All coins present: a stress case for the modulo arithmetic.
    cases.push({
      input: `100 100000\n${Array.from({ length: 100 }, (_, i) => i + 1).join(" ")}`,
    });
    return cases;
  },
});

defineProblem({
  id: "milk-routes",
  title: "Milk Routes",
  tier: "gold",
  order: 2,
  topics: ["shortest path", "dijkstra", "priority queue"],
  timeLimitMs: 2000,
  statement: `The dairy network has \`n\` depots and \`m\` one-way roads. Road \`j\` runs from \`u_j\` to \`v_j\` and takes \`w_j\` minutes.

A truck starts at depot \`1\`. For every depot, report the shortest travel time from depot \`1\`, or \`-1\` if it cannot be reached.

## Input

The first line contains \`n\` and \`m\` ( \`1 <= n <= 100000\`, \`0 <= m <= 200000\` ).
Each of the next \`m\` lines contains \`u_j\`, \`v_j\` and \`w_j\` ( \`1 <= u_j, v_j <= n\`, \`1 <= w_j <= 10^9\` ).

Roads are one-way. There may be several roads between the same pair of depots, and a road may loop from a depot to itself.

## Output

\`n\` integers on one line: the shortest time to depots \`1 … n\`, with \`-1\` for unreachable ones. The first number is always \`0\`.`,
  hints: [
    "All weights are positive, so Dijkstra applies. Breadth-first search does not — it only works when every edge costs the same.",
    "Use a priority queue keyed by tentative distance. Pop the closest unfinished node, relax its outgoing edges, repeat.",
    "Distances can reach 100000 × 10^9 = 10^14. A 32-bit int overflows; use `long long`.",
    "Skip a popped entry whose recorded distance is worse than the best you already know — that is the lazy-deletion trick that keeps the queue simple.",
  ],
  starter: {
    cpp: `#include <iostream>
#include <vector>
#include <queue>

int main() {
    int n, m;
    std::cin >> n >> m;
    std::vector<std::vector<std::pair<int, long long>>> adj(n + 1);
    for (int j = 0; j < m; ++j) {
        int u, v; long long w;
        std::cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }
    // Dijkstra from node 1.
    return 0;
}`,
    python: `import sys, heapq

data = sys.stdin.buffer.read().split()
n, m = int(data[0]), int(data[1])
adj = [[] for _ in range(n + 1)]
for j in range(m):
    u = int(data[2 + 3 * j]); v = int(data[3 + 3 * j]); w = int(data[4 + 3 * j])
    adj[u].append((v, w))
# Dijkstra from node 1.`,
  },
  solve: (input) => {
    const nums = input.trim().split(/\s+/).map(Number);
    const n = nums[0];
    const m = nums[1];

    const head = new Int32Array(n + 1).fill(-1);
    const nxt = new Int32Array(m);
    const to = new Int32Array(m);
    const wt = new Float64Array(m);

    for (let j = 0; j < m; j++) {
      const u = nums[2 + 3 * j];
      to[j] = nums[3 + 3 * j];
      wt[j] = nums[4 + 3 * j];
      nxt[j] = head[u];
      head[u] = j;
    }

    const INF = Infinity;
    const dist = new Float64Array(n + 1).fill(INF);
    dist[1] = 0;

    // Binary heap of [distance, node].
    const heap = [[0, 1]];
    const push = (item) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let s = i;
          if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
          if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
          if (s === i) break;
          [heap[s], heap[i]] = [heap[i], heap[s]];
          i = s;
        }
      }
      return top;
    };

    while (heap.length) {
      const [d, u] = pop();
      if (d > dist[u]) continue;
      for (let e = head[u]; e !== -1; e = nxt[e]) {
        const v = to[e];
        const nd = d + wt[e];
        if (nd < dist[v]) {
          dist[v] = nd;
          push([nd, v]);
        }
      }
    }

    const parts = [];
    for (let i = 1; i <= n; i++) {
      parts.push(dist[i] === INF ? "-1" : String(dist[i]));
    }
    return parts.join(" ");
  },
  cases: () => {
    const rand = rng(163);
    const cases = [
      { input: "4 4\n1 2 5\n2 3 2\n1 3 9\n3 4 1", sample: true },
      { input: "3 1\n1 2 4", sample: true },
      { input: "1 0\n" },
      { input: "2 1\n2 1 5" },
      { input: "2 2\n1 1 3\n1 2 7" },
    ];
    for (const [n, m] of [
      [50, 200],
      [2000, 8000],
      [25000, 60000],
    ]) {
      const lines = [`${n} ${m}`];
      for (let j = 0; j < m; j++) {
        lines.push(
          `${randInt(rand, 1, n)} ${randInt(rand, 1, n)} ${randInt(rand, 1, 1e9)}`,
        );
      }
      cases.push({ input: lines.join("\n") });
    }
    // A long path with maximum weights, to catch 32-bit overflow.
    const chainN = 25000;
    const chain = [`${chainN} ${chainN - 1}`];
    for (let i = 1; i < chainN; i++) chain.push(`${i} ${i + 1} 1000000000`);
    cases.push({ input: chain.join("\n") });
    return cases;
  },
});

/* ================================================================== */
/* Emit                                                                */
/* ================================================================== */

let totalTests = 0;

for (const problem of problems) {
  const cases = problem.cases().map((c) => {
    const input = c.input.endsWith("\n") ? c.input : c.input + "\n";
    return {
      input,
      output: problem.solve(input) + "\n",
      ...(c.sample ? { sample: true } : {}),
      ...(c.label ? { label: c.label } : {}),
    };
  });

  fs.writeFileSync(
    path.join(outDir, `${problem.id}.tests.json`),
    JSON.stringify(cases, null, 1),
  );

  // Emit YAML by hand so multi-line starter code keeps its formatting.
  const yaml = [
    "---",
    `title: ${JSON.stringify(problem.title)}`,
    `tier: ${problem.tier}`,
    `order: ${problem.order}`,
    `timeLimitMs: ${problem.timeLimitMs}`,
    "topics:",
    ...problem.topics.map((t) => `  - ${JSON.stringify(t)}`),
    "hints:",
    ...problem.hints.map((h) => `  - ${JSON.stringify(h)}`),
    "starter:",
    ...Object.entries(problem.starter).flatMap(([lang, code]) => [
      `  ${lang}: |`,
      ...code.split("\n").map((line) => `    ${line}`),
    ]),
    "---",
    "",
    problem.statement.trim(),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outDir, `${problem.id}.mdx`), yaml);

  totalTests += cases.length;
  const bytes = JSON.stringify(cases).length;
  console.log(
    `  ${problem.id.padEnd(22)} ${String(cases.length).padStart(3)} tests  ${(bytes / 1024).toFixed(0)} KB`,
  );
}

console.log(
  `\n${problems.length} problems, ${totalTests} test cases written to content/problems/`,
);
