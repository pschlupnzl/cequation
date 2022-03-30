import { TExecCollection } from "./IExec";

/** Generate a regular expression from the collection keys. */
export const collectionRegex = (
  collection: TExecCollection | object
): RegExp => {
  const keys = Object.keys(collection)
    .sort((a, b) =>
      a.length === b.length ? a.localeCompare(b) : b.length - a.length
    )
    .map((key) => key.replace(/[!]/g, (m) => `\\${m}`));
  return new RegExp(`^(${keys.join("|")})(?:[^A-Za-z]|$)`);
};
