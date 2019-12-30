
export class Policy {
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
    addRole(roleId: string) : void {
      if(!this.roleIndexMap.has(roleId))
        this.roleIndexMap.set(roleId, ++this.roleCount);
    }
    addNominationStatement(statement: Statement) : void {
       this.nominationStatements.push(statement);
    }

    addReleaseStatement(statement: Statement) : void {
      this.releaseStatements.push(statement);
   }

    print() {
      console.log('Roles: ')
      for (var [key, value] of this.roleIndexMap) {
        console.log(key + ': ' + value);
      }
      console.log('---------------------------')
      this.nominationStatements.forEach(value => {
        value.print();
        console.log('---------------------------')
      })
    }

}
export class Statement {
    nominator: string;
    nominee: string;
    bindingConstraint: DisjunctionSet = undefined;
    endorsementConstraint: DisjunctionSet = undefined;
    print() {
      console.log('Nominator: ', this.nominator);
      console.log('Nominee: ', this.nominee);
      if(this.bindingConstraint !== undefined){
         console.log('Binding Constraints ');
         this.bindingConstraint.print();
      }
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
    roles: Array<string> = new Array();

    print() {
       console.log('    [' + this.roles.toString() + ']')
    }
  }


