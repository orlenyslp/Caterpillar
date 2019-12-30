// Generated from ./src/models/dynamic_binding/antlr/binding_grammar.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeListener } from 'antlr4ts/tree/ParseTreeListener';

import { Binding_policyContext } from './binding_grammarParser';
import { Binding_setContext } from './binding_grammarParser';
import { Unbinding_setContext } from './binding_grammarParser';
import { Binding_statementContext } from './binding_grammarParser';
import { Unbinding_statementContext } from './binding_grammarParser';
import { Is_creatorContext } from './binding_grammarParser';
import { Binding_constrContext } from './binding_grammarParser';
import { Endorsement_constrContext } from './binding_grammarParser';
import { Set_expresionContext } from './binding_grammarParser';
import { Scope_restrictionContext } from './binding_grammarParser';
import { NominatorContext } from './binding_grammarParser';
import { NomineeContext } from './binding_grammarParser';
import { RoleContext } from './binding_grammarParser';
import { Role_path_expresionContext } from './binding_grammarParser';
import { Subprocess_idContext } from './binding_grammarParser';
import { Role_idContext } from './binding_grammarParser';
import { Task_idContext } from './binding_grammarParser';


/**
 * This interface defines a complete listener for a parse tree produced by
 * `binding_grammarParser`.
 */
export interface binding_grammarListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by `binding_grammarParser.binding_policy`.
	 * @param ctx the parse tree
	 */
	enterBinding_policy?: (ctx: Binding_policyContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.binding_policy`.
	 * @param ctx the parse tree
	 */
	exitBinding_policy?: (ctx: Binding_policyContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.binding_set`.
	 * @param ctx the parse tree
	 */
	enterBinding_set?: (ctx: Binding_setContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.binding_set`.
	 * @param ctx the parse tree
	 */
	exitBinding_set?: (ctx: Binding_setContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.unbinding_set`.
	 * @param ctx the parse tree
	 */
	enterUnbinding_set?: (ctx: Unbinding_setContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.unbinding_set`.
	 * @param ctx the parse tree
	 */
	exitUnbinding_set?: (ctx: Unbinding_setContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.binding_statement`.
	 * @param ctx the parse tree
	 */
	enterBinding_statement?: (ctx: Binding_statementContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.binding_statement`.
	 * @param ctx the parse tree
	 */
	exitBinding_statement?: (ctx: Binding_statementContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.unbinding_statement`.
	 * @param ctx the parse tree
	 */
	enterUnbinding_statement?: (ctx: Unbinding_statementContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.unbinding_statement`.
	 * @param ctx the parse tree
	 */
	exitUnbinding_statement?: (ctx: Unbinding_statementContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.is_creator`.
	 * @param ctx the parse tree
	 */
	enterIs_creator?: (ctx: Is_creatorContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.is_creator`.
	 * @param ctx the parse tree
	 */
	exitIs_creator?: (ctx: Is_creatorContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.binding_constr`.
	 * @param ctx the parse tree
	 */
	enterBinding_constr?: (ctx: Binding_constrContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.binding_constr`.
	 * @param ctx the parse tree
	 */
	exitBinding_constr?: (ctx: Binding_constrContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.endorsement_constr`.
	 * @param ctx the parse tree
	 */
	enterEndorsement_constr?: (ctx: Endorsement_constrContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.endorsement_constr`.
	 * @param ctx the parse tree
	 */
	exitEndorsement_constr?: (ctx: Endorsement_constrContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.set_expresion`.
	 * @param ctx the parse tree
	 */
	enterSet_expresion?: (ctx: Set_expresionContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.set_expresion`.
	 * @param ctx the parse tree
	 */
	exitSet_expresion?: (ctx: Set_expresionContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.scope_restriction`.
	 * @param ctx the parse tree
	 */
	enterScope_restriction?: (ctx: Scope_restrictionContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.scope_restriction`.
	 * @param ctx the parse tree
	 */
	exitScope_restriction?: (ctx: Scope_restrictionContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.nominator`.
	 * @param ctx the parse tree
	 */
	enterNominator?: (ctx: NominatorContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.nominator`.
	 * @param ctx the parse tree
	 */
	exitNominator?: (ctx: NominatorContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.nominee`.
	 * @param ctx the parse tree
	 */
	enterNominee?: (ctx: NomineeContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.nominee`.
	 * @param ctx the parse tree
	 */
	exitNominee?: (ctx: NomineeContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.role`.
	 * @param ctx the parse tree
	 */
	enterRole?: (ctx: RoleContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.role`.
	 * @param ctx the parse tree
	 */
	exitRole?: (ctx: RoleContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.role_path_expresion`.
	 * @param ctx the parse tree
	 */
	enterRole_path_expresion?: (ctx: Role_path_expresionContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.role_path_expresion`.
	 * @param ctx the parse tree
	 */
	exitRole_path_expresion?: (ctx: Role_path_expresionContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.subprocess_id`.
	 * @param ctx the parse tree
	 */
	enterSubprocess_id?: (ctx: Subprocess_idContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.subprocess_id`.
	 * @param ctx the parse tree
	 */
	exitSubprocess_id?: (ctx: Subprocess_idContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.role_id`.
	 * @param ctx the parse tree
	 */
	enterRole_id?: (ctx: Role_idContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.role_id`.
	 * @param ctx the parse tree
	 */
	exitRole_id?: (ctx: Role_idContext) => void;

	/**
	 * Enter a parse tree produced by `binding_grammarParser.task_id`.
	 * @param ctx the parse tree
	 */
	enterTask_id?: (ctx: Task_idContext) => void;
	/**
	 * Exit a parse tree produced by `binding_grammarParser.task_id`.
	 * @param ctx the parse tree
	 */
	exitTask_id?: (ctx: Task_idContext) => void;
}

