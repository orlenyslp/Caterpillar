
import {binding_grammarVisitor} from '../antlr/binding_grammarVisitor';

import { ParseTree } from 'antlr4ts/tree/ParseTree';
import { RuleNode } from 'antlr4ts/tree/RuleNode';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { ErrorNode } from 'antlr4ts/tree/ErrorNode';

import { Override } from 'antlr4ts/Decorators';

import { 
    Policy,
    Statement,
    DisjunctionSet,
    ConjunctionSet
 } from './DataStructures';
 
import { 
    Binding_statementContext, 
    NominatorContext, 
    NomineeContext, 
    Is_creatorContext, 
    Binding_constrContext, 
    Set_expresionContext, 
    RoleContext, 
    Endorsement_constrContext, 
    Unbinding_statementContext 
} from '../antlr/binding_grammarParser';

 
export class BindingVisitor implements binding_grammarVisitor<string> {

    _names: string[] = [];
    policy: Policy = new Policy();
   
    protected defaultResult(): string {
        return "";
    }

    updateRules(names: string[]) {
        this._names = names;
    }

    @Override
    visitTerminal(node: TerminalNode) {
        let res = node.toStringTree();
        if(res === 'and')
            return '&';
        else if(res === 'or')
            return '|';
        else
            return res;
    }

    @Override
    visitErrorNode(node: ErrorNode) {
        let res = node.toStringTree();
        return res;
    }

    visit(tree: ParseTree) {
        return tree.accept(this);
    }
    visitUnbinding_statement(ctx: Unbinding_statementContext) : string {
        let statement = new Statement();
        statement.nominator = ctx.nominator().accept(this);
        statement.nominee = ctx.nominee().accept(this);
        if(ctx.binding_constr() !== undefined)
            statement.bindingConstraint = this.createDisjunctionSet(ctx.binding_constr().accept(this));
        if(ctx.endorsement_constr() !== undefined)
            statement.endorsementConstraint = this.createDisjunctionSet(ctx.endorsement_constr().accept(this));
        this.policy.addReleaseStatement(statement);
        return '';

    }
    visitBinding_statement(ctx: Binding_statementContext) : string {
        if(ctx.is_creator() !== undefined) {
            let creator = ctx.is_creator().accept(this);
            this.policy.setCreator(creator);
        } else {
            let statement = new Statement();
            statement.nominator = ctx.nominator().accept(this);
            statement.nominee = ctx.nominee().accept(this);
            if(ctx.binding_constr() !== undefined)
               statement.bindingConstraint = this.createDisjunctionSet(ctx.binding_constr().accept(this));
            if(ctx.endorsement_constr() !== undefined)
                statement.endorsementConstraint = this.createDisjunctionSet(ctx.endorsement_constr().accept(this));
            this.policy.addNominationStatement(statement);
        }
        return '';
    }
    visitIs_creator(ctx: Is_creatorContext) : string {
        return ctx.role().text;        
    }
    visitNominator (ctx: NominatorContext) : string {
        this.policy.addRole(ctx.text);
        return ctx.text;
    }
   	visitNominee(ctx: NomineeContext) : string {
        this.policy.addRole(ctx.text);
        return ctx.text;
    }
    visitRole(ctx: RoleContext) : string {
        this.policy.addRole(ctx.text);
        return ctx.text;
    }
    visitBinding_constr(ctx: Binding_constrContext) : string {
        let neg = ctx.NOT() === undefined ? '+' : '-';
        return neg + ctx.set_expresion().accept(this);
    }
    visitEndorsement_constr(ctx: Endorsement_constrContext) : string {
        return '+' + ctx.set_expresion().accept(this);
    }
    visitSet_expresion(ctx: Set_expresionContext) : string {
        let exp = '';
        for(let i = 0; i < ctx.childCount; i++) 
            exp += ctx.getChild(i).accept(this);
        return exp;
    }
    visitChildren(node: RuleNode) : string {

       let nodeName = this._names[node.ruleContext.ruleIndex];
       let res = '';
       for (let i = 0; i < node.childCount; i++) 
            res += node.getChild(i).accept(this);
        return res;
  
    }
    createDisjunctionSet(setStr: string) : DisjunctionSet {
        let disjunctionSet = new DisjunctionSet();
        disjunctionSet.isNegative = setStr[0] === '+' ? false : true;
        let conjS = setStr.substr(1).split('|');
        conjS.forEach(value => {
            let conjuntionSet = new ConjunctionSet();
            conjuntionSet.roles = value.split('&');
            disjunctionSet.conjunctionSets.push(conjuntionSet);
        })
        return disjunctionSet;
    }

}