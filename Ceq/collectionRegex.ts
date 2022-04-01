import { TExecCollection } from "./IExec";

/**
 * Generate a regular expression from the collection keys, sorted by length
 * descending to ensure most specific match first.
 * @param collection Object whose keys to combine.
 */
export const collectionRegex = (
  collection: TExecCollection | object
): RegExp => {
  const keys = Object.keys(collection)
    .sort((a, b) =>
      a.length === b.length ? a.localeCompare(b) : b.length - a.length
    )
    .map((key) => key.replace(/([\/\\!])/g, "\\$1"));
  return new RegExp(`^(${keys.join("|")})(?:[^A-Za-z]|$)`);
};
