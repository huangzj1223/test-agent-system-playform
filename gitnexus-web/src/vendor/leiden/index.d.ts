
import Graph from 'graphology';
// @ts-expect-error  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VmxGMVJRPT06NzM5NGJkYzU=

type RNGFunction = () => number;

export type LeidenOptions = {
  attributes?: {
    community?: string;
    weight?: string;
  };
  randomWalk?: boolean;
  resolution?: number;
  rng?: RNGFunction;
  weighted?: boolean;
};

type LeidenMapping = { [key: string]: number };

export type DetailedLeidenOutput = {
  communities: LeidenMapping;
  count: number;
  deltaComputations: number;
  dendrogram: Array<any>;
  modularity: number;
  moves: Array<Array<number>> | Array<number>;
  nodesVisited: number;
  resolution: number;
};
// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VmxGMVJRPT06NzM5NGJkYzU=

declare const leiden: {
  (graph: Graph, options?: LeidenOptions): LeidenMapping;
  assign(graph: Graph, options?: LeidenOptions): void;
  detailed(graph: Graph, options?: LeidenOptions): DetailedLeidenOutput;
};

export default leiden;
