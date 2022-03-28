/** Declaration for executor function. */
export interface IExec {
  /** Expected number of arguments. Negative means variable-count. */
  narg: number;
  /** Executor function. */
  f: (...args: number[]) => number;
}

/** Collection of executor functions keyed by function name. */
export type TExecCollection = { [key: string]: IExec };
