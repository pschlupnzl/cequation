export interface IParserOptions {
  /** Insert implicit multiplication, i.e. 2 sin(2) --> 2 x sin(2). */
  implicitMultiplication?: boolean;
}
