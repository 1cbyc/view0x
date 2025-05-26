declare module '@solidity-parser/parser' {
  export interface Parser {
    parse(source: string): any;
  }

  export const Parser: Parser;
} 