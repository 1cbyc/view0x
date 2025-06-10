export interface Location {
    start: number;
    end: number;
}

export interface Contract {
    type: 'ContractDefinition';
    name: string;
    subNodes: Node[];
    loc?: Location;
}

export interface FunctionDefinition {
    type: 'FunctionDefinition';
    name: string;
    body?: {
        statements: Statement[];
    };
    loc?: Location;
    modifiers?: Modifier[];
}

export interface Modifier {
    name: string;
    arguments?: Expression[];
}

export interface Statement {
    type: string;
    loc?: Location;
    statements?: Statement[];
    expression?: Expression;
}

export interface Expression {
    type: string;
    left?: Expression;
    right?: Expression;
    expression?: Expression;
    memberName?: string;
    operator?: string;
    name?: string;
    arguments?: Expression[];
}

export interface Node {
    type: string;
    loc?: Location;
    subNodes?: Node[];
    body?: {
        statements: Statement[];
    };
    modifiers?: Modifier[];
} 