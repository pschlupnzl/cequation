import { TExecCollection } from "./IExec";

const M_PI_180 = Math.PI / 180.0;
const M_180_PI = 180.0 / Math.PI;

/** Constants understood by the evaluator. */
export const constants: { [key: string]: number } = {
  pi: Math.PI,
};

/**
 * Functions and their evaluators.
 */
export const argops: TExecCollection = {
  abs: { narg: 1, f: (x) => Math.abs(x) },
  sqrt: { narg: 1, f: (x) => Math.sqrt(x) },
  floor: { narg: 1, f: (x) => Math.floor(x) },
  ceil: { narg: 1, f: (x) => Math.ceil(x) },
  round: { narg: 1, f: (x) => Math.round(x) },
  log: { narg: 1, f: (x) => Math.log(x) },
  log10: { narg: 1, f: (x) => Math.log10(x) },
  sin: { narg: 1, f: (x) => Math.sin(x) },
  cos: { narg: 1, f: (x) => Math.cos(x) },
  tan: { narg: 1, f: (x) => Math.tan(x) },
  asin: { narg: 1, f: (x) => Math.asin(x) },
  acos: { narg: 1, f: (x) => Math.acos(x) },
  atan: { narg: 1, f: (x) => Math.atan(x) },
  atan2: { narg: 2, f: (y, x) => Math.atan2(y, x) },
  sind: { narg: 1, f: (x) => Math.sin(x * M_PI_180) },
  cosd: { narg: 1, f: (x) => Math.cos(x * M_PI_180) },
  tand: { narg: 1, f: (x) => Math.tan(x * M_PI_180) },
  asind: { narg: 1, f: (x) => Math.asin(x) * M_180_PI },
  acosd: { narg: 1, f: (x) => Math.acos(x) * M_180_PI },
  atand: { narg: 1, f: (x) => Math.atan(x) * M_180_PI },
  atan2d: { narg: 2, f: (y, x) => Math.atan2(y, x) * M_180_PI },

  cosh: { narg: 1, f: (x) => 0.5 * (Math.exp(x) + Math.exp(-x)) },
  sinh: { narg: 1, f: (x) => 0.5 * (Math.exp(x) - Math.exp(-x)) },
  tanh: { narg: 1, f: (x) => (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1) },

  "!": { narg: 1, f: (x) => (x === 0 ? 1 : 0) },
  sgn: { narg: 1, f: (x) => (x < 0 ? -1 : x > 0 ? 1 : 0) },
  mod: { narg: 2, f: (a, b) => a % b },

  max: { narg: -1, f: (...args) => Math.max(...args) },
  min: { narg: -1, f: (...args) => Math.min(...args) },
};
