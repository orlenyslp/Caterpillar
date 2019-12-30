
export class AgreementPolicy {
    roleIndexMap: Map<string, number> = new Map();
    roleCount: number = 0;
    requestStatements: Array<AStatement> = new Array();
    solidity: string = undefined;

    addRole(roleId: string) : void {
      if(!this.roleIndexMap.has(roleId))
        this.roleIndexMap.set(roleId, ++this.roleCount);
    }
    addRequestStatement(statement: AStatement) : void {
       this.requestStatements.push(statement);
    }

    print() {
      console.log('Roles: ')
      for (var [key, value] of this.roleIndexMap) {
        console.log(key + ': ' + value);
      }
      console.log('---------------------------')
      this.requestStatements.forEach(value => {
        value.print();
        console.log('---------------------------')
      })
    }

}
export class AStatement {
    proposer: string;
    action: string;
    element: string;
    with: string;
    endorsementConstraint: DisjunctionSet = undefined;
    
    print() {
      console.log('Proposer: ', this.proposer);
      console.log('Action: ', this.action);
      console.log('Element', this.element)
      if(this.endorsementConstraint !== undefined){
        console.log('Endorsement Constraints ');
        this.endorsementConstraint.print();
     }
    }

  }
  
  export class DisjunctionSet {
    isNegative: boolean;
    conjunctionSets: Array<ConjunctionSet> = new Array();

    print() {
      console.log('  Disjunction Set: ', this.isNegative ? 'NOT IN' : 'IN');
      this.conjunctionSets.forEach(value => {
        value.print();

      })
    }
  }

  export class ConjunctionSet {
    roles: Array<number> = new Array();

    print() {
       console.log('    [' + this.roles.toString() + ']')
    }
  }


