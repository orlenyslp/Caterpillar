// Generated from ./src/models/dynamic_binding/antlr/binding_grammar.g4 by ANTLR 4.6-SNAPSHOT


import { ATN } from 'antlr4ts/atn/ATN';
import { ATNDeserializer } from 'antlr4ts/atn/ATNDeserializer';
import { FailedPredicateException } from 'antlr4ts/FailedPredicateException';
import { NotNull } from 'antlr4ts/Decorators';
import { NoViableAltException } from 'antlr4ts/NoViableAltException';
import { Override } from 'antlr4ts/Decorators';
import { Parser } from 'antlr4ts/Parser';
import { ParserRuleContext } from 'antlr4ts/ParserRuleContext';
import { ParserATNSimulator } from 'antlr4ts/atn/ParserATNSimulator';
import { ParseTreeListener } from 'antlr4ts/tree/ParseTreeListener';
import { ParseTreeVisitor } from 'antlr4ts/tree/ParseTreeVisitor';
import { RecognitionException } from 'antlr4ts/RecognitionException';
import { RuleContext } from 'antlr4ts/RuleContext';
import { RuleVersion } from 'antlr4ts/RuleVersion';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { Token } from 'antlr4ts/Token';
import { TokenStream } from 'antlr4ts/TokenStream';
import { Vocabulary } from 'antlr4ts/Vocabulary';
import { VocabularyImpl } from 'antlr4ts/VocabularyImpl';

import * as Utils from 'antlr4ts/misc/Utils';

import { binding_grammarListener } from './binding_grammarListener';
import { binding_grammarVisitor } from './binding_grammarVisitor';


export class binding_grammarParser extends Parser {
	public static readonly NOMINATES=1;
	public static readonly RELEASES=2;
	public static readonly SELF=3;
	public static readonly ENDORSED_BY=4;
	public static readonly CASE_CREATOR=5;
	public static readonly AND=6;
	public static readonly OR=7;
	public static readonly IS=8;
	public static readonly IN=9;
	public static readonly NOT=10;
	public static readonly UNDER=11;
	public static readonly COMMA=12;
	public static readonly DOT=13;
	public static readonly SEMICOLON=14;
	public static readonly LPAREN=15;
	public static readonly RPAREN=16;
	public static readonly LBRACES=17;
	public static readonly RBRACES=18;
	public static readonly IDENTIFIER=19;
	public static readonly WS=20;
	public static readonly RULE_binding_policy = 0;
	public static readonly RULE_binding_set = 1;
	public static readonly RULE_unbinding_set = 2;
	public static readonly RULE_binding_statement = 3;
	public static readonly RULE_unbinding_statement = 4;
	public static readonly RULE_is_creator = 5;
	public static readonly RULE_binding_constr = 6;
	public static readonly RULE_endorsement_constr = 7;
	public static readonly RULE_set_expresion = 8;
	public static readonly RULE_scope_restriction = 9;
	public static readonly RULE_nominator = 10;
	public static readonly RULE_nominee = 11;
	public static readonly RULE_role = 12;
	public static readonly RULE_role_path_expresion = 13;
	public static readonly RULE_subprocess_id = 14;
	public static readonly RULE_role_id = 15;
	public static readonly RULE_task_id = 16;
	public static readonly ruleNames: string[] = [
		"binding_policy", "binding_set", "unbinding_set", "binding_statement", 
		"unbinding_statement", "is_creator", "binding_constr", "endorsement_constr", 
		"set_expresion", "scope_restriction", "nominator", "nominee", "role", 
		"role_path_expresion", "subprocess_id", "role_id", "task_id"
	];

	private static readonly _LITERAL_NAMES: (string | undefined)[] = [
		undefined, "'nominates'", "'releases'", "'self'", undefined, "'case-creator'", 
		"'and'", "'or'", "'is'", "'in'", "'not'", "'Under'", "','", "'.'", "';'", 
		"'('", "')'", "'{'", "'}'"
	];
	private static readonly _SYMBOLIC_NAMES: (string | undefined)[] = [
		undefined, "NOMINATES", "RELEASES", "SELF", "ENDORSED_BY", "CASE_CREATOR", 
		"AND", "OR", "IS", "IN", "NOT", "UNDER", "COMMA", "DOT", "SEMICOLON", 
		"LPAREN", "RPAREN", "LBRACES", "RBRACES", "IDENTIFIER", "WS"
	];
	public static readonly VOCABULARY: Vocabulary = new VocabularyImpl(binding_grammarParser._LITERAL_NAMES, binding_grammarParser._SYMBOLIC_NAMES, []);

	@Override
	@NotNull
	public get vocabulary(): Vocabulary {
		return binding_grammarParser.VOCABULARY;
	}

	@Override
	public get grammarFileName(): string { return "binding_grammar.g4"; }

	@Override
	public get ruleNames(): string[] { return binding_grammarParser.ruleNames; }

	@Override
	public get serializedATN(): string { return binding_grammarParser._serializedATN; }

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(binding_grammarParser._ATN, this);
	}
	@RuleVersion(0)
	public binding_policy(): Binding_policyContext {
		let _localctx: Binding_policyContext = new Binding_policyContext(this._ctx, this.state);
		this.enterRule(_localctx, 0, binding_grammarParser.RULE_binding_policy);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 34;
			this.binding_set();
			this.state = 35;
			this.unbinding_set();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public binding_set(): Binding_setContext {
		let _localctx: Binding_setContext = new Binding_setContext(this._ctx, this.state);
		this.enterRule(_localctx, 2, binding_grammarParser.RULE_binding_set);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 37;
			this.match(binding_grammarParser.LBRACES);
			this.state = 38;
			this.binding_statement();
			this.state = 43;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===binding_grammarParser.SEMICOLON) {
				{
				{
				this.state = 39;
				this.match(binding_grammarParser.SEMICOLON);
				this.state = 40;
				this.binding_statement();
				}
				}
				this.state = 45;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			this.state = 46;
			this.match(binding_grammarParser.RBRACES);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public unbinding_set(): Unbinding_setContext {
		let _localctx: Unbinding_setContext = new Unbinding_setContext(this._ctx, this.state);
		this.enterRule(_localctx, 4, binding_grammarParser.RULE_unbinding_set);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 48;
			this.match(binding_grammarParser.LBRACES);
			this.state = 58;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case binding_grammarParser.SELF:
			case binding_grammarParser.IDENTIFIER:
				{
				this.state = 49;
				this.unbinding_statement();
				this.state = 54;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===binding_grammarParser.SEMICOLON) {
					{
					{
					this.state = 50;
					this.match(binding_grammarParser.SEMICOLON);
					this.state = 51;
					this.unbinding_statement();
					}
					}
					this.state = 56;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				}
				break;
			case binding_grammarParser.RBRACES:
				{
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			this.state = 60;
			this.match(binding_grammarParser.RBRACES);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public binding_statement(): Binding_statementContext {
		let _localctx: Binding_statementContext = new Binding_statementContext(this._ctx, this.state);
		this.enterRule(_localctx, 6, binding_grammarParser.RULE_binding_statement);
		let _la: number;
		try {
			this.state = 75;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input,6,this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 62;
				this.is_creator();
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 64;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===binding_grammarParser.UNDER) {
					{
					this.state = 63;
					this.scope_restriction();
					}
				}

				this.state = 66;
				this.nominator();
				this.state = 67;
				this.match(binding_grammarParser.NOMINATES);
				this.state = 68;
				this.nominee();
				this.state = 70;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===binding_grammarParser.IN || _la===binding_grammarParser.NOT) {
					{
					this.state = 69;
					this.binding_constr();
					}
				}

				this.state = 73;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===binding_grammarParser.ENDORSED_BY) {
					{
					this.state = 72;
					this.endorsement_constr();
					}
				}

				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public unbinding_statement(): Unbinding_statementContext {
		let _localctx: Unbinding_statementContext = new Unbinding_statementContext(this._ctx, this.state);
		this.enterRule(_localctx, 8, binding_grammarParser.RULE_unbinding_statement);
		let _la: number;
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 77;
			this.nominator();
			this.state = 78;
			this.match(binding_grammarParser.RELEASES);
			this.state = 79;
			this.nominee();
			this.state = 81;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===binding_grammarParser.IN || _la===binding_grammarParser.NOT) {
				{
				this.state = 80;
				this.binding_constr();
				}
			}

			this.state = 84;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===binding_grammarParser.ENDORSED_BY) {
				{
				this.state = 83;
				this.endorsement_constr();
				}
			}

			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public is_creator(): Is_creatorContext {
		let _localctx: Is_creatorContext = new Is_creatorContext(this._ctx, this.state);
		this.enterRule(_localctx, 10, binding_grammarParser.RULE_is_creator);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 86;
			this.role();
			this.state = 87;
			this.match(binding_grammarParser.IS);
			this.state = 88;
			this.match(binding_grammarParser.CASE_CREATOR);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public binding_constr(): Binding_constrContext {
		let _localctx: Binding_constrContext = new Binding_constrContext(this._ctx, this.state);
		this.enterRule(_localctx, 12, binding_grammarParser.RULE_binding_constr);
		try {
			this.state = 95;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case binding_grammarParser.NOT:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 90;
				this.match(binding_grammarParser.NOT);
				this.state = 91;
				this.match(binding_grammarParser.IN);
				this.state = 92;
				this.set_expresion();
				}
				break;
			case binding_grammarParser.IN:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 93;
				this.match(binding_grammarParser.IN);
				this.state = 94;
				this.set_expresion();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public endorsement_constr(): Endorsement_constrContext {
		let _localctx: Endorsement_constrContext = new Endorsement_constrContext(this._ctx, this.state);
		this.enterRule(_localctx, 14, binding_grammarParser.RULE_endorsement_constr);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 97;
			this.match(binding_grammarParser.ENDORSED_BY);
			this.state = 98;
			this.set_expresion();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public set_expresion(): Set_expresionContext {
		let _localctx: Set_expresionContext = new Set_expresionContext(this._ctx, this.state);
		this.enterRule(_localctx, 16, binding_grammarParser.RULE_set_expresion);
		try {
			this.state = 113;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input,10,this._ctx) ) {
			case 1:
				this.enterOuterAlt(_localctx, 1);
				{
				this.state = 100;
				this.match(binding_grammarParser.LPAREN);
				this.state = 101;
				this.set_expresion();
				this.state = 102;
				this.match(binding_grammarParser.RPAREN);
				}
				break;

			case 2:
				this.enterOuterAlt(_localctx, 2);
				{
				this.state = 104;
				this.role();
				this.state = 105;
				this.match(binding_grammarParser.OR);
				this.state = 106;
				this.set_expresion();
				}
				break;

			case 3:
				this.enterOuterAlt(_localctx, 3);
				{
				this.state = 108;
				this.role();
				this.state = 109;
				this.match(binding_grammarParser.AND);
				this.state = 110;
				this.set_expresion();
				}
				break;

			case 4:
				this.enterOuterAlt(_localctx, 4);
				{
				this.state = 112;
				this.role();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public scope_restriction(): Scope_restrictionContext {
		let _localctx: Scope_restrictionContext = new Scope_restrictionContext(this._ctx, this.state);
		this.enterRule(_localctx, 18, binding_grammarParser.RULE_scope_restriction);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 115;
			this.match(binding_grammarParser.UNDER);
			this.state = 116;
			this.subprocess_id();
			this.state = 117;
			this.match(binding_grammarParser.COMMA);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public nominator(): NominatorContext {
		let _localctx: NominatorContext = new NominatorContext(this._ctx, this.state);
		this.enterRule(_localctx, 20, binding_grammarParser.RULE_nominator);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 119;
			this.role();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public nominee(): NomineeContext {
		let _localctx: NomineeContext = new NomineeContext(this._ctx, this.state);
		this.enterRule(_localctx, 22, binding_grammarParser.RULE_nominee);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 121;
			this.role();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public role(): RoleContext {
		let _localctx: RoleContext = new RoleContext(this._ctx, this.state);
		this.enterRule(_localctx, 24, binding_grammarParser.RULE_role);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 126;
			this._errHandler.sync(this);
			switch ( this.interpreter.adaptivePredict(this._input,11,this._ctx) ) {
			case 1:
				{
				this.state = 123;
				this.role_id();
				}
				break;

			case 2:
				{
				this.state = 124;
				this.role_path_expresion();
				}
				break;

			case 3:
				{
				this.state = 125;
				this.match(binding_grammarParser.SELF);
				}
				break;
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public role_path_expresion(): Role_path_expresionContext {
		let _localctx: Role_path_expresionContext = new Role_path_expresionContext(this._ctx, this.state);
		this.enterRule(_localctx, 26, binding_grammarParser.RULE_role_path_expresion);
		try {
			let _alt: number;
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 131; 
			this._errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					this.state = 128;
					this.subprocess_id();
					this.state = 129;
					this.match(binding_grammarParser.DOT);
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				this.state = 133; 
				this._errHandler.sync(this);
				_alt = this.interpreter.adaptivePredict(this._input,12,this._ctx);
			} while ( _alt!==2 && _alt!==ATN.INVALID_ALT_NUMBER );
			this.state = 135;
			this.role_id();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public subprocess_id(): Subprocess_idContext {
		let _localctx: Subprocess_idContext = new Subprocess_idContext(this._ctx, this.state);
		this.enterRule(_localctx, 28, binding_grammarParser.RULE_subprocess_id);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 137;
			this.match(binding_grammarParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public role_id(): Role_idContext {
		let _localctx: Role_idContext = new Role_idContext(this._ctx, this.state);
		this.enterRule(_localctx, 30, binding_grammarParser.RULE_role_id);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 139;
			this.match(binding_grammarParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}
	@RuleVersion(0)
	public task_id(): Task_idContext {
		let _localctx: Task_idContext = new Task_idContext(this._ctx, this.state);
		this.enterRule(_localctx, 32, binding_grammarParser.RULE_task_id);
		try {
			this.enterOuterAlt(_localctx, 1);
			{
			this.state = 141;
			this.match(binding_grammarParser.IDENTIFIER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				_localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return _localctx;
	}

	public static readonly _serializedATN: string =
		"\x03\uAF6F\u8320\u479D\uB75C\u4880\u1605\u191C\uAB37\x03\x16\x92\x04\x02"+
		"\t\x02\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07"+
		"\t\x07\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04"+
		"\x0E\t\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x04\x12\t\x12\x03"+
		"\x02\x03\x02\x03\x02\x03\x03\x03\x03\x03\x03\x03\x03\x07\x03,\n\x03\f"+
		"\x03\x0E\x03/\v\x03\x03\x03\x03\x03\x03\x04\x03\x04\x03\x04\x03\x04\x07"+
		"\x047\n\x04\f\x04\x0E\x04:\v\x04\x03\x04\x05\x04=\n\x04\x03\x04\x03\x04"+
		"\x03\x05\x03\x05\x05\x05C\n\x05\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05"+
		"I\n\x05\x03\x05\x05\x05L\n\x05\x05\x05N\n\x05\x03\x06\x03\x06\x03\x06"+
		"\x03\x06\x05\x06T\n\x06\x03\x06\x05\x06W\n\x06\x03\x07\x03\x07\x03\x07"+
		"\x03\x07\x03\b\x03\b\x03\b\x03\b\x03\b\x05\bb\n\b\x03\t\x03\t\x03\t\x03"+
		"\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03\n\x03"+
		"\n\x05\nt\n\n\x03\v\x03\v\x03\v\x03\v\x03\f\x03\f\x03\r\x03\r\x03\x0E"+
		"\x03\x0E\x03\x0E\x05\x0E\x81\n\x0E\x03\x0F\x03\x0F\x03\x0F\x06\x0F\x86"+
		"\n\x0F\r\x0F\x0E\x0F\x87\x03\x0F\x03\x0F\x03\x10\x03\x10\x03\x11\x03\x11"+
		"\x03\x12\x03\x12\x03\x12\x02\x02\x02\x13\x02\x02\x04\x02\x06\x02\b\x02"+
		"\n\x02\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18\x02\x1A\x02\x1C"+
		"\x02\x1E\x02 \x02\"\x02\x02\x02\x90\x02$\x03\x02\x02\x02\x04\'\x03\x02"+
		"\x02\x02\x062\x03\x02\x02\x02\bM\x03\x02\x02\x02\nO\x03\x02\x02\x02\f"+
		"X\x03\x02\x02\x02\x0Ea\x03\x02\x02\x02\x10c\x03\x02\x02\x02\x12s\x03\x02"+
		"\x02\x02\x14u\x03\x02\x02\x02\x16y\x03\x02\x02\x02\x18{\x03\x02\x02\x02"+
		"\x1A\x80\x03\x02\x02\x02\x1C\x85\x03\x02\x02\x02\x1E\x8B\x03\x02\x02\x02"+
		" \x8D\x03\x02\x02\x02\"\x8F\x03\x02\x02\x02$%\x05\x04\x03\x02%&\x05\x06"+
		"\x04\x02&\x03\x03\x02\x02\x02\'(\x07\x13\x02\x02(-\x05\b\x05\x02)*\x07"+
		"\x10\x02\x02*,\x05\b\x05\x02+)\x03\x02\x02\x02,/\x03\x02\x02\x02-+\x03"+
		"\x02\x02\x02-.\x03\x02\x02\x02.0\x03\x02\x02\x02/-\x03\x02\x02\x0201\x07"+
		"\x14\x02\x021\x05\x03\x02\x02\x022<\x07\x13\x02\x0238\x05\n\x06\x0245"+
		"\x07\x10\x02\x0257\x05\n\x06\x0264\x03\x02\x02\x027:\x03\x02\x02\x028"+
		"6\x03\x02\x02\x0289\x03\x02\x02\x029=\x03\x02\x02\x02:8\x03\x02\x02\x02"+
		";=\x03\x02\x02\x02<3\x03\x02\x02\x02<;\x03\x02\x02\x02=>\x03\x02\x02\x02"+
		">?\x07\x14\x02\x02?\x07\x03\x02\x02\x02@N\x05\f\x07\x02AC\x05\x14\v\x02"+
		"BA\x03\x02\x02\x02BC\x03\x02\x02\x02CD\x03\x02\x02\x02DE\x05\x16\f\x02"+
		"EF\x07\x03\x02\x02FH\x05\x18\r\x02GI\x05\x0E\b\x02HG\x03\x02\x02\x02H"+
		"I\x03\x02\x02\x02IK\x03\x02\x02\x02JL\x05\x10\t\x02KJ\x03\x02\x02\x02"+
		"KL\x03\x02\x02\x02LN\x03\x02\x02\x02M@\x03\x02\x02\x02MB\x03\x02\x02\x02"+
		"N\t\x03\x02\x02\x02OP\x05\x16\f\x02PQ\x07\x04\x02\x02QS\x05\x18\r\x02"+
		"RT\x05\x0E\b\x02SR\x03\x02\x02\x02ST\x03\x02\x02\x02TV\x03\x02\x02\x02"+
		"UW\x05\x10\t\x02VU\x03\x02\x02\x02VW\x03\x02\x02\x02W\v\x03\x02\x02\x02"+
		"XY\x05\x1A\x0E\x02YZ\x07\n\x02\x02Z[\x07\x07\x02\x02[\r\x03\x02\x02\x02"+
		"\\]\x07\f\x02\x02]^\x07\v\x02\x02^b\x05\x12\n\x02_`\x07\v\x02\x02`b\x05"+
		"\x12\n\x02a\\\x03\x02\x02\x02a_\x03\x02\x02\x02b\x0F\x03\x02\x02\x02c"+
		"d\x07\x06\x02\x02de\x05\x12\n\x02e\x11\x03\x02\x02\x02fg\x07\x11\x02\x02"+
		"gh\x05\x12\n\x02hi\x07\x12\x02\x02it\x03\x02\x02\x02jk\x05\x1A\x0E\x02"+
		"kl\x07\t\x02\x02lm\x05\x12\n\x02mt\x03\x02\x02\x02no\x05\x1A\x0E\x02o"+
		"p\x07\b\x02\x02pq\x05\x12\n\x02qt\x03\x02\x02\x02rt\x05\x1A\x0E\x02sf"+
		"\x03\x02\x02\x02sj\x03\x02\x02\x02sn\x03\x02\x02\x02sr\x03\x02\x02\x02"+
		"t\x13\x03\x02\x02\x02uv\x07\r\x02\x02vw\x05\x1E\x10\x02wx\x07\x0E\x02"+
		"\x02x\x15\x03\x02\x02\x02yz\x05\x1A\x0E\x02z\x17\x03\x02\x02\x02{|\x05"+
		"\x1A\x0E\x02|\x19\x03\x02\x02\x02}\x81\x05 \x11\x02~\x81\x05\x1C\x0F\x02"+
		"\x7F\x81\x07\x05\x02\x02\x80}\x03\x02\x02\x02\x80~\x03\x02\x02\x02\x80"+
		"\x7F\x03\x02\x02\x02\x81\x1B\x03\x02\x02\x02\x82\x83\x05\x1E\x10\x02\x83"+
		"\x84\x07\x0F\x02\x02\x84\x86\x03\x02\x02\x02\x85\x82\x03\x02\x02\x02\x86"+
		"\x87\x03\x02\x02\x02\x87\x85\x03\x02\x02\x02\x87\x88\x03\x02\x02\x02\x88"+
		"\x89\x03\x02\x02\x02\x89\x8A\x05 \x11\x02\x8A\x1D\x03\x02\x02\x02\x8B"+
		"\x8C\x07\x15\x02\x02\x8C\x1F\x03\x02\x02\x02\x8D\x8E\x07\x15\x02\x02\x8E"+
		"!\x03\x02\x02\x02\x8F\x90\x07\x15\x02\x02\x90#\x03\x02\x02\x02\x0F-8<"+
		"BHKMSVas\x80\x87";
	public static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!binding_grammarParser.__ATN) {
			binding_grammarParser.__ATN = new ATNDeserializer().deserialize(Utils.toCharArray(binding_grammarParser._serializedATN));
		}

		return binding_grammarParser.__ATN;
	}

}

export class Binding_policyContext extends ParserRuleContext {
	public binding_set(): Binding_setContext {
		return this.getRuleContext(0, Binding_setContext);
	}
	public unbinding_set(): Unbinding_setContext {
		return this.getRuleContext(0, Unbinding_setContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_binding_policy; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterBinding_policy) listener.enterBinding_policy(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitBinding_policy) listener.exitBinding_policy(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitBinding_policy) return visitor.visitBinding_policy(this);
		else return visitor.visitChildren(this);
	}
}


export class Binding_setContext extends ParserRuleContext {
	public LBRACES(): TerminalNode { return this.getToken(binding_grammarParser.LBRACES, 0); }
	public binding_statement(): Binding_statementContext[];
	public binding_statement(i: number): Binding_statementContext;
	public binding_statement(i?: number): Binding_statementContext | Binding_statementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Binding_statementContext);
		} else {
			return this.getRuleContext(i, Binding_statementContext);
		}
	}
	public RBRACES(): TerminalNode { return this.getToken(binding_grammarParser.RBRACES, 0); }
	public SEMICOLON(): TerminalNode[];
	public SEMICOLON(i: number): TerminalNode;
	public SEMICOLON(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(binding_grammarParser.SEMICOLON);
		} else {
			return this.getToken(binding_grammarParser.SEMICOLON, i);
		}
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_binding_set; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterBinding_set) listener.enterBinding_set(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitBinding_set) listener.exitBinding_set(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitBinding_set) return visitor.visitBinding_set(this);
		else return visitor.visitChildren(this);
	}
}


export class Unbinding_setContext extends ParserRuleContext {
	public LBRACES(): TerminalNode { return this.getToken(binding_grammarParser.LBRACES, 0); }
	public RBRACES(): TerminalNode { return this.getToken(binding_grammarParser.RBRACES, 0); }
	public unbinding_statement(): Unbinding_statementContext[];
	public unbinding_statement(i: number): Unbinding_statementContext;
	public unbinding_statement(i?: number): Unbinding_statementContext | Unbinding_statementContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Unbinding_statementContext);
		} else {
			return this.getRuleContext(i, Unbinding_statementContext);
		}
	}
	public SEMICOLON(): TerminalNode[];
	public SEMICOLON(i: number): TerminalNode;
	public SEMICOLON(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(binding_grammarParser.SEMICOLON);
		} else {
			return this.getToken(binding_grammarParser.SEMICOLON, i);
		}
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_unbinding_set; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterUnbinding_set) listener.enterUnbinding_set(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitUnbinding_set) listener.exitUnbinding_set(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitUnbinding_set) return visitor.visitUnbinding_set(this);
		else return visitor.visitChildren(this);
	}
}


export class Binding_statementContext extends ParserRuleContext {
	public is_creator(): Is_creatorContext | undefined {
		return this.tryGetRuleContext(0, Is_creatorContext);
	}
	public nominator(): NominatorContext | undefined {
		return this.tryGetRuleContext(0, NominatorContext);
	}
	public NOMINATES(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.NOMINATES, 0); }
	public nominee(): NomineeContext | undefined {
		return this.tryGetRuleContext(0, NomineeContext);
	}
	public scope_restriction(): Scope_restrictionContext | undefined {
		return this.tryGetRuleContext(0, Scope_restrictionContext);
	}
	public binding_constr(): Binding_constrContext | undefined {
		return this.tryGetRuleContext(0, Binding_constrContext);
	}
	public endorsement_constr(): Endorsement_constrContext | undefined {
		return this.tryGetRuleContext(0, Endorsement_constrContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_binding_statement; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterBinding_statement) listener.enterBinding_statement(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitBinding_statement) listener.exitBinding_statement(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitBinding_statement) return visitor.visitBinding_statement(this);
		else return visitor.visitChildren(this);
	}
}


export class Unbinding_statementContext extends ParserRuleContext {
	public nominator(): NominatorContext {
		return this.getRuleContext(0, NominatorContext);
	}
	public RELEASES(): TerminalNode { return this.getToken(binding_grammarParser.RELEASES, 0); }
	public nominee(): NomineeContext {
		return this.getRuleContext(0, NomineeContext);
	}
	public binding_constr(): Binding_constrContext | undefined {
		return this.tryGetRuleContext(0, Binding_constrContext);
	}
	public endorsement_constr(): Endorsement_constrContext | undefined {
		return this.tryGetRuleContext(0, Endorsement_constrContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_unbinding_statement; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterUnbinding_statement) listener.enterUnbinding_statement(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitUnbinding_statement) listener.exitUnbinding_statement(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitUnbinding_statement) return visitor.visitUnbinding_statement(this);
		else return visitor.visitChildren(this);
	}
}


export class Is_creatorContext extends ParserRuleContext {
	public role(): RoleContext {
		return this.getRuleContext(0, RoleContext);
	}
	public IS(): TerminalNode { return this.getToken(binding_grammarParser.IS, 0); }
	public CASE_CREATOR(): TerminalNode { return this.getToken(binding_grammarParser.CASE_CREATOR, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_is_creator; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterIs_creator) listener.enterIs_creator(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitIs_creator) listener.exitIs_creator(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitIs_creator) return visitor.visitIs_creator(this);
		else return visitor.visitChildren(this);
	}
}


export class Binding_constrContext extends ParserRuleContext {
	public NOT(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.NOT, 0); }
	public IN(): TerminalNode { return this.getToken(binding_grammarParser.IN, 0); }
	public set_expresion(): Set_expresionContext {
		return this.getRuleContext(0, Set_expresionContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_binding_constr; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterBinding_constr) listener.enterBinding_constr(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitBinding_constr) listener.exitBinding_constr(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitBinding_constr) return visitor.visitBinding_constr(this);
		else return visitor.visitChildren(this);
	}
}


export class Endorsement_constrContext extends ParserRuleContext {
	public ENDORSED_BY(): TerminalNode { return this.getToken(binding_grammarParser.ENDORSED_BY, 0); }
	public set_expresion(): Set_expresionContext {
		return this.getRuleContext(0, Set_expresionContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_endorsement_constr; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterEndorsement_constr) listener.enterEndorsement_constr(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitEndorsement_constr) listener.exitEndorsement_constr(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitEndorsement_constr) return visitor.visitEndorsement_constr(this);
		else return visitor.visitChildren(this);
	}
}


export class Set_expresionContext extends ParserRuleContext {
	public LPAREN(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.LPAREN, 0); }
	public set_expresion(): Set_expresionContext | undefined {
		return this.tryGetRuleContext(0, Set_expresionContext);
	}
	public RPAREN(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.RPAREN, 0); }
	public role(): RoleContext | undefined {
		return this.tryGetRuleContext(0, RoleContext);
	}
	public OR(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.OR, 0); }
	public AND(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.AND, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_set_expresion; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterSet_expresion) listener.enterSet_expresion(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitSet_expresion) listener.exitSet_expresion(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitSet_expresion) return visitor.visitSet_expresion(this);
		else return visitor.visitChildren(this);
	}
}


export class Scope_restrictionContext extends ParserRuleContext {
	public UNDER(): TerminalNode { return this.getToken(binding_grammarParser.UNDER, 0); }
	public subprocess_id(): Subprocess_idContext {
		return this.getRuleContext(0, Subprocess_idContext);
	}
	public COMMA(): TerminalNode { return this.getToken(binding_grammarParser.COMMA, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_scope_restriction; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterScope_restriction) listener.enterScope_restriction(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitScope_restriction) listener.exitScope_restriction(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitScope_restriction) return visitor.visitScope_restriction(this);
		else return visitor.visitChildren(this);
	}
}


export class NominatorContext extends ParserRuleContext {
	public role(): RoleContext {
		return this.getRuleContext(0, RoleContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_nominator; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterNominator) listener.enterNominator(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitNominator) listener.exitNominator(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitNominator) return visitor.visitNominator(this);
		else return visitor.visitChildren(this);
	}
}


export class NomineeContext extends ParserRuleContext {
	public role(): RoleContext {
		return this.getRuleContext(0, RoleContext);
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_nominee; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterNominee) listener.enterNominee(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitNominee) listener.exitNominee(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitNominee) return visitor.visitNominee(this);
		else return visitor.visitChildren(this);
	}
}


export class RoleContext extends ParserRuleContext {
	public role_id(): Role_idContext | undefined {
		return this.tryGetRuleContext(0, Role_idContext);
	}
	public role_path_expresion(): Role_path_expresionContext | undefined {
		return this.tryGetRuleContext(0, Role_path_expresionContext);
	}
	public SELF(): TerminalNode | undefined { return this.tryGetToken(binding_grammarParser.SELF, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_role; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterRole) listener.enterRole(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitRole) listener.exitRole(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitRole) return visitor.visitRole(this);
		else return visitor.visitChildren(this);
	}
}


export class Role_path_expresionContext extends ParserRuleContext {
	public role_id(): Role_idContext {
		return this.getRuleContext(0, Role_idContext);
	}
	public subprocess_id(): Subprocess_idContext[];
	public subprocess_id(i: number): Subprocess_idContext;
	public subprocess_id(i?: number): Subprocess_idContext | Subprocess_idContext[] {
		if (i === undefined) {
			return this.getRuleContexts(Subprocess_idContext);
		} else {
			return this.getRuleContext(i, Subprocess_idContext);
		}
	}
	public DOT(): TerminalNode[];
	public DOT(i: number): TerminalNode;
	public DOT(i?: number): TerminalNode | TerminalNode[] {
		if (i === undefined) {
			return this.getTokens(binding_grammarParser.DOT);
		} else {
			return this.getToken(binding_grammarParser.DOT, i);
		}
	}
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_role_path_expresion; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterRole_path_expresion) listener.enterRole_path_expresion(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitRole_path_expresion) listener.exitRole_path_expresion(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitRole_path_expresion) return visitor.visitRole_path_expresion(this);
		else return visitor.visitChildren(this);
	}
}


export class Subprocess_idContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(binding_grammarParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_subprocess_id; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterSubprocess_id) listener.enterSubprocess_id(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitSubprocess_id) listener.exitSubprocess_id(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitSubprocess_id) return visitor.visitSubprocess_id(this);
		else return visitor.visitChildren(this);
	}
}


export class Role_idContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(binding_grammarParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_role_id; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterRole_id) listener.enterRole_id(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitRole_id) listener.exitRole_id(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitRole_id) return visitor.visitRole_id(this);
		else return visitor.visitChildren(this);
	}
}


export class Task_idContext extends ParserRuleContext {
	public IDENTIFIER(): TerminalNode { return this.getToken(binding_grammarParser.IDENTIFIER, 0); }
	constructor(parent: ParserRuleContext, invokingState: number);
	constructor(parent: ParserRuleContext, invokingState: number) {
		super(parent, invokingState);

	}
	@Override public get ruleIndex(): number { return binding_grammarParser.RULE_task_id; }
	@Override
	public enterRule(listener: binding_grammarListener): void {
		if (listener.enterTask_id) listener.enterTask_id(this);
	}
	@Override
	public exitRule(listener: binding_grammarListener): void {
		if (listener.exitTask_id) listener.exitTask_id(this);
	}
	@Override
	public accept<Result>(visitor: binding_grammarVisitor<Result>): Result {
		if (visitor.visitTask_id) return visitor.visitTask_id(this);
		else return visitor.visitChildren(this);
	}
}


