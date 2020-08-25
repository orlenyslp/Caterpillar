export class Policy {
  model: string = undefined;
  caseCreator: string = undefined;
  roleIndexMap: Map<string, number> = new Map();
  roleCount: number = 0;
  nominationStatements: Array<Statement> = new Array();
  releaseStatements: Array<Statement> = new Array();
  solidity: string = undefined;

  setCreator(caseCreator: string) {
    this.caseCreator = caseCreator;
    this.addRole(caseCreator);
  }
  
  addRole(roleId: string): void {
    if (!this.roleIndexMap.has(roleId))
      this.roleIndexMap.set(roleId, ++this.roleCount);
  }

  addNominationStatement(statement: Statement): void {
    this.nominationStatements.push(statement);
  }

  addReleaseStatement(statement: Statement): void {
    this.releaseStatements.push(statement);
  }
}

export class Statement {
  nominator: string;
  nominee: string;
  bindingConstraint: DisjunctionSet = undefined;
  endorsementConstraint: DisjunctionSet = undefined;
}

export class DisjunctionSet {
  isNegative: boolean;
  conjunctionSets: Array<ConjunctionSet> = new Array();
}

export class ConjunctionSet {
  roles: Array<string> = new Array();
}
