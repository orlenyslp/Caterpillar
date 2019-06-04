// Generated from ./src/models/dynamic_binding/antlr/binding_grammar.g4 by ANTLR 4.6-SNAPSHOT


import { ParseTreeVisitor } from 'antlr4ts/tree/ParseTreeVisitor';

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
 * This interface defines a complete generic visitor for a parse tree produced
 * by `binding_grammarParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export interface binding_grammarVisitor<Result> extends ParseTreeVisitor<Result> {
	/**
	 * Visit a parse tree produced by `binding_grammarParser.binding_policy`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBinding_policy?: (ctx: Binding_policyContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.binding_set`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBinding_set?: (ctx: Binding_setContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.unbinding_set`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnbinding_set?: (ctx: Unbinding_setContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.binding_statement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBinding_statement?: (ctx: Binding_statementContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.unbinding_statement`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitUnbinding_statement?: (ctx: Unbinding_statementContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.is_creator`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitIs_creator?: (ctx: Is_creatorContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.binding_constr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitBinding_constr?: (ctx: Binding_constrContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.endorsement_constr`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitEndorsement_constr?: (ctx: Endorsement_constrContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.set_expresion`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSet_expresion?: (ctx: Set_expresionContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.scope_restriction`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitScope_restriction?: (ctx: Scope_restrictionContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.nominator`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNominator?: (ctx: NominatorContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.nominee`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitNominee?: (ctx: NomineeContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.role`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRole?: (ctx: RoleContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.role_path_expresion`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRole_path_expresion?: (ctx: Role_path_expresionContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.subprocess_id`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitSubprocess_id?: (ctx: Subprocess_idContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.role_id`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitRole_id?: (ctx: Role_idContext) => Result;

	/**
	 * Visit a parse tree produced by `binding_grammarParser.task_id`.
	 * @param ctx the parse tree
	 * @return the visitor result
	 */
	visitTask_id?: (ctx: Task_idContext) => Result;
}

