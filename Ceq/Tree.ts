import CEq from "./Ceq";
import { constants, execs } from "./constants";
import { IToken, TokenType } from "./IToken";

export interface INodeTokenChild {
  /** The child node. */
  node: TreeNode;
  /** Value indicating whether the child is "inverse", e.g. "/" or "-". */
  inverse?: boolean;
}

/** Inversions for operator chain. */
const operatorInverse = {
  "/": "*",
  "-": "+",
};

class TreeNode implements IToken {
  public position: number;
  public type: TokenType;
  public match: string;
  public length: number;
  public narg: number | undefined;
  public parent: TreeNode | undefined;
  public children: INodeTokenChild[] | undefined;

  constructor(token: IToken, parent?: TreeNode, children?: TreeNode[]) {
    this.position = token.position;
    this.type = token.type;
    this.match = token.match;
    this.narg = token.narg;
    this.parent = parent;
    this.children = children?.map((node) => ({ node, inverse: false }));

    // Map inverse operations / --> *, - --> + and invert operator.
    if (
      children &&
      token.type === TokenType.BinaryOp &&
      operatorInverse[this.match]
    ) {
      this.match = operatorInverse[this.match];
      for (let index = this.children.length - 1; index >= 1; index -= 1) {
        this.children[index].inverse = true;
      }
    }
  }

  /**
   * Return the numerical value for myself.
   */
  public calc(): number {
    switch (this.type) {
      case TokenType.Number:
        return +this.match;
      case TokenType.Constant:
        return constants[this.match];
    }

    if (this.match === "*") {
      return this.children.reduce(
        (x, ch) => (ch.inverse ? x / ch.node.calc() : x * ch.node.calc()),
        1
      );
    } else if (this.match === "+") {
      return this.children.reduce(
        (x, ch) => (ch.inverse ? x - ch.node.calc() : x + ch.node.calc()),
        0
      );
    }

    const exec = execs[this.match];
    return exec.f(...this.children.map((child) => child.node.calc()));
  }

  /**
   * Flatten this node by collapsing any matching grandchildren as a child.
   * 2 * 3 / 4
   * Parsed tree       With Inverse     Collected
   * (*)               (*)              (*)
   *  |-----+           ↑-----↑          ↑----↑----↓
   *  2    (/)          2    (*)         2    3    4
   *        |----+            ↑----↓
   *        3    4            3    4
   */
  public flatten(): TreeNode {
    // Children recursively.
    this.children?.forEach((child) => child.node.flatten());

    // Simplify my children.
    if (this.type === TokenType.BinaryOp && ["*", "+"].includes(this.match)) {
      for (let index = this.children.length - 1; index >= 0; index -= 1) {
        const child = this.children[index];
        if (child.node.type === this.type && child.node.match === this.match) {
          this.children.splice(index, 1);
          this.children.push(
            ...child.node.children.map((g) => ({
              inverse: child.inverse !== g.inverse, // XOR
              node: g.node,
            }))
          );
        }
      }
    }
    return this;
  }
}

/**
 * Tree representation of parsed equation.
 */
class Tree {
  /** Top node of the expression tree. */
  private _origin: TreeNode | undefined;

  constructor(origin: TreeNode) {
    this._origin = origin;
  }

  /**
   * Create a new tree from the parsed equation.
   * @param ceq Equation object for which to build the tree.
   */
  public static from(ceq: CEq): Tree {
    const origin = ceq.reduce<TreeNode>(
      (token: IToken) => new TreeNode(token),
      (opToken: TreeNode, argTokens: TreeNode[]): TreeNode => {
        argTokens.forEach((t) => (t.parent = opToken));
        return new TreeNode(opToken, opToken.parent, argTokens);
      }
    );
    return new Tree(origin);
  }

  /**
   * Prints a text-friendly view of the tree into the console.
   */
  public print(): Tree {
    const getBounds = (
      origin: TreeNode
    ): { maxcol: number; maxdepth: number; maxlen: number } => {
      let col = 0;
      let maxcol = 0;
      let maxdepth = 0;
      let maxlen = 0;
      const recursive = (node: TreeNode, depth: number = 0) => {
        node["depth"] = depth;
        node["ticks"] = [];
        node["label"] = [TokenType.Number, TokenType.Constant].includes(
          node.type
        )
          ? `${node.match}`
          : `(${node.match})`;
        maxcol = col > maxcol ? col : maxcol;
        maxdepth = depth > maxdepth ? depth : maxdepth;
        maxlen = node["label"].length > maxlen ? node["label"].length : maxlen;

        if (node.children) {
          node.children?.forEach((child) => {
            node["ticks"].push(col);
            recursive(child.node, depth + 1);
            col += 1;
          });
          col -= 1;
        } else {
          node["ticks"].push(col);
        }
      };
      recursive(origin, 0);
      return { maxcol, maxdepth, maxlen };
    };

    const show = (origin: TreeNode) => {
      const bounds = getBounds(origin);
      const w = bounds.maxlen + 1;
      const rows = new Array(2 * bounds.maxdepth + 1)
        .join(".")
        .split(".")
        .map((_) => new Array(w * bounds.maxcol + 3).join(" "));

      const insert = (
        depth: number,
        col: number,
        ins: string | number,
        rowshift = 0
      ): void => {
        const r = 2 * depth + rowshift;
        let c = w * col;
        if (typeof ins === "number") {
          ins = `|${new Array(w * ins).join("-")}+`;
        }
        if (ins[0] !== "(") {
          c += 1;
        }
        rows[r] = `${rows[r].substring(0, c)}${ins}${rows[r].substring(
          c + ins.length
        )}`;
      };

      const recursive = (node: TreeNode) => {
        const depth = node["depth"];
        const col = node["ticks"][0];
        const label = node["label"];
        insert(depth, col, label);
        if (node.children) {
          insert(depth, col, "|", 1);
          node["ticks"]
            .slice(0, node["ticks"].length - 1)
            .forEach((tick: number, index: number) =>
              insert(depth, tick, node["ticks"][index + 1] - tick, 1)
            );
          node.children.forEach((child, index) => {
            insert(depth, node["ticks"][index], child.inverse ? "↓" : "↑", 1);
          });
          node.children?.forEach((child) => recursive(child.node));
        }
      };
      recursive(origin);
      rows.forEach((row) => console.log(row));
    };

    show(this._origin);
    return this;
  }

  /**
   * Simplify the tree for chained products.
   */
  public simplify(): Tree {
    this._origin.flatten();
    return this;
  }

  /** Calculate the current value and display it. */
  public calc(): Tree {
    console.log(` = ${this._origin.calc()}`);
    return this;
  }
}

export default Tree;
