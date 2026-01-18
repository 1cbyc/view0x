declare module 'solc' {
  export interface CompilerInput {
    language: string;
    sources: {
      [key: string]: {
        content: string;
      };
    };
    settings: {
      outputSelection: {
        [key: string]: {
          [key: string]: string[];
        };
      };
    };
  }

  export interface CompilerOutput {
    contracts: {
      [key: string]: {
        [key: string]: {
          abi: any[];
          evm: {
            bytecode: {
              object: string;
            };
          };
        };
      };
    };
    errors: any[];
  }

  export function compile(input: string): CompilerOutput;
  export function version(): string;
} 