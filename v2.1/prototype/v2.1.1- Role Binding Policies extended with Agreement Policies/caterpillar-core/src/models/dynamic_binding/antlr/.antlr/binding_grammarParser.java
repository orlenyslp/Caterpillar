// Generated from c:\BackUp\Research\00\caterpillar\Prototype\caterpillar-core\src\models\dynamic_binding\antlr\binding_grammar.g4 by ANTLR 4.7.1
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.misc.*;
import org.antlr.v4.runtime.tree.*;
import java.util.List;
import java.util.Iterator;
import java.util.ArrayList;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast"})
public class binding_grammarParser extends Parser {
	static { RuntimeMetaData.checkVersion("4.7.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		NOMINATES=1, RELEASES=2, SELF=3, ENDORSED_BY=4, CASE_CREATOR=5, AND=6, 
		OR=7, IS=8, IN=9, NOT=10, UNDER=11, COMMA=12, DOT=13, SEMICOLON=14, LPAREN=15, 
		RPAREN=16, LBRACES=17, RBRACES=18, IDENTIFIER=19, WS=20;
	public static final int
		RULE_binding_policy = 0, RULE_binding_set = 1, RULE_unbinding_set = 2, 
		RULE_binding_statement = 3, RULE_unbinding_statement = 4, RULE_is_creator = 5, 
		RULE_binding_constr = 6, RULE_endorsement_constr = 7, RULE_set_expresion = 8, 
		RULE_scope_restriction = 9, RULE_nominator = 10, RULE_nominee = 11, RULE_role = 12, 
		RULE_role_path_expresion = 13, RULE_subprocess_id = 14, RULE_role_id = 15, 
		RULE_task_id = 16;
	public static final String[] ruleNames = {
		"binding_policy", "binding_set", "unbinding_set", "binding_statement", 
		"unbinding_statement", "is_creator", "binding_constr", "endorsement_constr", 
		"set_expresion", "scope_restriction", "nominator", "nominee", "role", 
		"role_path_expresion", "subprocess_id", "role_id", "task_id"
	};

	private static final String[] _LITERAL_NAMES = {
		null, "'nominates'", "'releases'", "'self'", null, "'case-creator'", "'and'", 
		"'or'", "'is'", "'in'", "'not'", "'Under'", "','", "'.'", "';'", "'('", 
		"')'", "'{'", "'}'"
	};
	private static final String[] _SYMBOLIC_NAMES = {
		null, "NOMINATES", "RELEASES", "SELF", "ENDORSED_BY", "CASE_CREATOR", 
		"AND", "OR", "IS", "IN", "NOT", "UNDER", "COMMA", "DOT", "SEMICOLON", 
		"LPAREN", "RPAREN", "LBRACES", "RBRACES", "IDENTIFIER", "WS"
	};
	public static final Vocabulary VOCABULARY = new VocabularyImpl(_LITERAL_NAMES, _SYMBOLIC_NAMES);

	/**
	 * @deprecated Use {@link #VOCABULARY} instead.
	 */
	@Deprecated
	public static final String[] tokenNames;
	static {
		tokenNames = new String[_SYMBOLIC_NAMES.length];
		for (int i = 0; i < tokenNames.length; i++) {
			tokenNames[i] = VOCABULARY.getLiteralName(i);
			if (tokenNames[i] == null) {
				tokenNames[i] = VOCABULARY.getSymbolicName(i);
			}

			if (tokenNames[i] == null) {
				tokenNames[i] = "<INVALID>";
			}
		}
	}

	@Override
	@Deprecated
	public String[] getTokenNames() {
		return tokenNames;
	}

	@Override

	public Vocabulary getVocabulary() {
		return VOCABULARY;
	}

	@Override
	public String getGrammarFileName() { return "binding_grammar.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public ATN getATN() { return _ATN; }

	public binding_grammarParser(TokenStream input) {
		super(input);
		_interp = new ParserATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}
	public static class Binding_policyContext extends ParserRuleContext {
		public Binding_setContext binding_set() {
			return getRuleContext(Binding_setContext.class,0);
		}
		public Unbinding_setContext unbinding_set() {
			return getRuleContext(Unbinding_setContext.class,0);
		}
		public Binding_policyContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_binding_policy; }
	}

	public final Binding_policyContext binding_policy() throws RecognitionException {
		Binding_policyContext _localctx = new Binding_policyContext(_ctx, getState());
		enterRule(_localctx, 0, RULE_binding_policy);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(34);
			binding_set();
			setState(35);
			unbinding_set();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Binding_setContext extends ParserRuleContext {
		public TerminalNode LBRACES() { return getToken(binding_grammarParser.LBRACES, 0); }
		public List<Binding_statementContext> binding_statement() {
			return getRuleContexts(Binding_statementContext.class);
		}
		public Binding_statementContext binding_statement(int i) {
			return getRuleContext(Binding_statementContext.class,i);
		}
		public TerminalNode RBRACES() { return getToken(binding_grammarParser.RBRACES, 0); }
		public List<TerminalNode> SEMICOLON() { return getTokens(binding_grammarParser.SEMICOLON); }
		public TerminalNode SEMICOLON(int i) {
			return getToken(binding_grammarParser.SEMICOLON, i);
		}
		public Binding_setContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_binding_set; }
	}

	public final Binding_setContext binding_set() throws RecognitionException {
		Binding_setContext _localctx = new Binding_setContext(_ctx, getState());
		enterRule(_localctx, 2, RULE_binding_set);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(37);
			match(LBRACES);
			setState(38);
			binding_statement();
			setState(43);
			_errHandler.sync(this);
			_la = _input.LA(1);
			while (_la==SEMICOLON) {
				{
				{
				setState(39);
				match(SEMICOLON);
				setState(40);
				binding_statement();
				}
				}
				setState(45);
				_errHandler.sync(this);
				_la = _input.LA(1);
			}
			setState(46);
			match(RBRACES);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Unbinding_setContext extends ParserRuleContext {
		public TerminalNode LBRACES() { return getToken(binding_grammarParser.LBRACES, 0); }
		public TerminalNode RBRACES() { return getToken(binding_grammarParser.RBRACES, 0); }
		public List<Unbinding_statementContext> unbinding_statement() {
			return getRuleContexts(Unbinding_statementContext.class);
		}
		public Unbinding_statementContext unbinding_statement(int i) {
			return getRuleContext(Unbinding_statementContext.class,i);
		}
		public List<TerminalNode> SEMICOLON() { return getTokens(binding_grammarParser.SEMICOLON); }
		public TerminalNode SEMICOLON(int i) {
			return getToken(binding_grammarParser.SEMICOLON, i);
		}
		public Unbinding_setContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_unbinding_set; }
	}

	public final Unbinding_setContext unbinding_set() throws RecognitionException {
		Unbinding_setContext _localctx = new Unbinding_setContext(_ctx, getState());
		enterRule(_localctx, 4, RULE_unbinding_set);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(48);
			match(LBRACES);
			setState(58);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case SELF:
			case IDENTIFIER:
				{
				setState(49);
				unbinding_statement();
				setState(54);
				_errHandler.sync(this);
				_la = _input.LA(1);
				while (_la==SEMICOLON) {
					{
					{
					setState(50);
					match(SEMICOLON);
					setState(51);
					unbinding_statement();
					}
					}
					setState(56);
					_errHandler.sync(this);
					_la = _input.LA(1);
				}
				}
				break;
			case RBRACES:
				{
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
			setState(60);
			match(RBRACES);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Binding_statementContext extends ParserRuleContext {
		public Is_creatorContext is_creator() {
			return getRuleContext(Is_creatorContext.class,0);
		}
		public NominatorContext nominator() {
			return getRuleContext(NominatorContext.class,0);
		}
		public TerminalNode NOMINATES() { return getToken(binding_grammarParser.NOMINATES, 0); }
		public NomineeContext nominee() {
			return getRuleContext(NomineeContext.class,0);
		}
		public Scope_restrictionContext scope_restriction() {
			return getRuleContext(Scope_restrictionContext.class,0);
		}
		public Binding_constrContext binding_constr() {
			return getRuleContext(Binding_constrContext.class,0);
		}
		public Endorsement_constrContext endorsement_constr() {
			return getRuleContext(Endorsement_constrContext.class,0);
		}
		public Binding_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_binding_statement; }
	}

	public final Binding_statementContext binding_statement() throws RecognitionException {
		Binding_statementContext _localctx = new Binding_statementContext(_ctx, getState());
		enterRule(_localctx, 6, RULE_binding_statement);
		int _la;
		try {
			setState(75);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,6,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(62);
				is_creator();
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(64);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==UNDER) {
					{
					setState(63);
					scope_restriction();
					}
				}

				setState(66);
				nominator();
				setState(67);
				match(NOMINATES);
				setState(68);
				nominee();
				setState(70);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==IN || _la==NOT) {
					{
					setState(69);
					binding_constr();
					}
				}

				setState(73);
				_errHandler.sync(this);
				_la = _input.LA(1);
				if (_la==ENDORSED_BY) {
					{
					setState(72);
					endorsement_constr();
					}
				}

				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Unbinding_statementContext extends ParserRuleContext {
		public NominatorContext nominator() {
			return getRuleContext(NominatorContext.class,0);
		}
		public TerminalNode RELEASES() { return getToken(binding_grammarParser.RELEASES, 0); }
		public NomineeContext nominee() {
			return getRuleContext(NomineeContext.class,0);
		}
		public Binding_constrContext binding_constr() {
			return getRuleContext(Binding_constrContext.class,0);
		}
		public Endorsement_constrContext endorsement_constr() {
			return getRuleContext(Endorsement_constrContext.class,0);
		}
		public Unbinding_statementContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_unbinding_statement; }
	}

	public final Unbinding_statementContext unbinding_statement() throws RecognitionException {
		Unbinding_statementContext _localctx = new Unbinding_statementContext(_ctx, getState());
		enterRule(_localctx, 8, RULE_unbinding_statement);
		int _la;
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(77);
			nominator();
			setState(78);
			match(RELEASES);
			setState(79);
			nominee();
			setState(81);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==IN || _la==NOT) {
				{
				setState(80);
				binding_constr();
				}
			}

			setState(84);
			_errHandler.sync(this);
			_la = _input.LA(1);
			if (_la==ENDORSED_BY) {
				{
				setState(83);
				endorsement_constr();
				}
			}

			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Is_creatorContext extends ParserRuleContext {
		public RoleContext role() {
			return getRuleContext(RoleContext.class,0);
		}
		public TerminalNode IS() { return getToken(binding_grammarParser.IS, 0); }
		public TerminalNode CASE_CREATOR() { return getToken(binding_grammarParser.CASE_CREATOR, 0); }
		public Is_creatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_is_creator; }
	}

	public final Is_creatorContext is_creator() throws RecognitionException {
		Is_creatorContext _localctx = new Is_creatorContext(_ctx, getState());
		enterRule(_localctx, 10, RULE_is_creator);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(86);
			role();
			setState(87);
			match(IS);
			setState(88);
			match(CASE_CREATOR);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Binding_constrContext extends ParserRuleContext {
		public TerminalNode NOT() { return getToken(binding_grammarParser.NOT, 0); }
		public TerminalNode IN() { return getToken(binding_grammarParser.IN, 0); }
		public Set_expresionContext set_expresion() {
			return getRuleContext(Set_expresionContext.class,0);
		}
		public Binding_constrContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_binding_constr; }
	}

	public final Binding_constrContext binding_constr() throws RecognitionException {
		Binding_constrContext _localctx = new Binding_constrContext(_ctx, getState());
		enterRule(_localctx, 12, RULE_binding_constr);
		try {
			setState(95);
			_errHandler.sync(this);
			switch (_input.LA(1)) {
			case NOT:
				enterOuterAlt(_localctx, 1);
				{
				setState(90);
				match(NOT);
				setState(91);
				match(IN);
				setState(92);
				set_expresion();
				}
				break;
			case IN:
				enterOuterAlt(_localctx, 2);
				{
				setState(93);
				match(IN);
				setState(94);
				set_expresion();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Endorsement_constrContext extends ParserRuleContext {
		public TerminalNode ENDORSED_BY() { return getToken(binding_grammarParser.ENDORSED_BY, 0); }
		public Set_expresionContext set_expresion() {
			return getRuleContext(Set_expresionContext.class,0);
		}
		public Endorsement_constrContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_endorsement_constr; }
	}

	public final Endorsement_constrContext endorsement_constr() throws RecognitionException {
		Endorsement_constrContext _localctx = new Endorsement_constrContext(_ctx, getState());
		enterRule(_localctx, 14, RULE_endorsement_constr);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(97);
			match(ENDORSED_BY);
			setState(98);
			set_expresion();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Set_expresionContext extends ParserRuleContext {
		public TerminalNode LPAREN() { return getToken(binding_grammarParser.LPAREN, 0); }
		public Set_expresionContext set_expresion() {
			return getRuleContext(Set_expresionContext.class,0);
		}
		public TerminalNode RPAREN() { return getToken(binding_grammarParser.RPAREN, 0); }
		public RoleContext role() {
			return getRuleContext(RoleContext.class,0);
		}
		public TerminalNode OR() { return getToken(binding_grammarParser.OR, 0); }
		public TerminalNode AND() { return getToken(binding_grammarParser.AND, 0); }
		public Set_expresionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_set_expresion; }
	}

	public final Set_expresionContext set_expresion() throws RecognitionException {
		Set_expresionContext _localctx = new Set_expresionContext(_ctx, getState());
		enterRule(_localctx, 16, RULE_set_expresion);
		try {
			setState(113);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,10,_ctx) ) {
			case 1:
				enterOuterAlt(_localctx, 1);
				{
				setState(100);
				match(LPAREN);
				setState(101);
				set_expresion();
				setState(102);
				match(RPAREN);
				}
				break;
			case 2:
				enterOuterAlt(_localctx, 2);
				{
				setState(104);
				role();
				setState(105);
				match(OR);
				setState(106);
				set_expresion();
				}
				break;
			case 3:
				enterOuterAlt(_localctx, 3);
				{
				setState(108);
				role();
				setState(109);
				match(AND);
				setState(110);
				set_expresion();
				}
				break;
			case 4:
				enterOuterAlt(_localctx, 4);
				{
				setState(112);
				role();
				}
				break;
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Scope_restrictionContext extends ParserRuleContext {
		public TerminalNode UNDER() { return getToken(binding_grammarParser.UNDER, 0); }
		public Subprocess_idContext subprocess_id() {
			return getRuleContext(Subprocess_idContext.class,0);
		}
		public TerminalNode COMMA() { return getToken(binding_grammarParser.COMMA, 0); }
		public Scope_restrictionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_scope_restriction; }
	}

	public final Scope_restrictionContext scope_restriction() throws RecognitionException {
		Scope_restrictionContext _localctx = new Scope_restrictionContext(_ctx, getState());
		enterRule(_localctx, 18, RULE_scope_restriction);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(115);
			match(UNDER);
			setState(116);
			subprocess_id();
			setState(117);
			match(COMMA);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class NominatorContext extends ParserRuleContext {
		public RoleContext role() {
			return getRuleContext(RoleContext.class,0);
		}
		public NominatorContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_nominator; }
	}

	public final NominatorContext nominator() throws RecognitionException {
		NominatorContext _localctx = new NominatorContext(_ctx, getState());
		enterRule(_localctx, 20, RULE_nominator);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(119);
			role();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class NomineeContext extends ParserRuleContext {
		public RoleContext role() {
			return getRuleContext(RoleContext.class,0);
		}
		public NomineeContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_nominee; }
	}

	public final NomineeContext nominee() throws RecognitionException {
		NomineeContext _localctx = new NomineeContext(_ctx, getState());
		enterRule(_localctx, 22, RULE_nominee);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(121);
			role();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class RoleContext extends ParserRuleContext {
		public Role_idContext role_id() {
			return getRuleContext(Role_idContext.class,0);
		}
		public Role_path_expresionContext role_path_expresion() {
			return getRuleContext(Role_path_expresionContext.class,0);
		}
		public TerminalNode SELF() { return getToken(binding_grammarParser.SELF, 0); }
		public RoleContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_role; }
	}

	public final RoleContext role() throws RecognitionException {
		RoleContext _localctx = new RoleContext(_ctx, getState());
		enterRule(_localctx, 24, RULE_role);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(126);
			_errHandler.sync(this);
			switch ( getInterpreter().adaptivePredict(_input,11,_ctx) ) {
			case 1:
				{
				setState(123);
				role_id();
				}
				break;
			case 2:
				{
				setState(124);
				role_path_expresion();
				}
				break;
			case 3:
				{
				setState(125);
				match(SELF);
				}
				break;
			}
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Role_path_expresionContext extends ParserRuleContext {
		public Role_idContext role_id() {
			return getRuleContext(Role_idContext.class,0);
		}
		public List<Subprocess_idContext> subprocess_id() {
			return getRuleContexts(Subprocess_idContext.class);
		}
		public Subprocess_idContext subprocess_id(int i) {
			return getRuleContext(Subprocess_idContext.class,i);
		}
		public List<TerminalNode> DOT() { return getTokens(binding_grammarParser.DOT); }
		public TerminalNode DOT(int i) {
			return getToken(binding_grammarParser.DOT, i);
		}
		public Role_path_expresionContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_role_path_expresion; }
	}

	public final Role_path_expresionContext role_path_expresion() throws RecognitionException {
		Role_path_expresionContext _localctx = new Role_path_expresionContext(_ctx, getState());
		enterRule(_localctx, 26, RULE_role_path_expresion);
		try {
			int _alt;
			enterOuterAlt(_localctx, 1);
			{
			setState(131); 
			_errHandler.sync(this);
			_alt = 1;
			do {
				switch (_alt) {
				case 1:
					{
					{
					setState(128);
					subprocess_id();
					setState(129);
					match(DOT);
					}
					}
					break;
				default:
					throw new NoViableAltException(this);
				}
				setState(133); 
				_errHandler.sync(this);
				_alt = getInterpreter().adaptivePredict(_input,12,_ctx);
			} while ( _alt!=2 && _alt!=org.antlr.v4.runtime.atn.ATN.INVALID_ALT_NUMBER );
			setState(135);
			role_id();
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Subprocess_idContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(binding_grammarParser.IDENTIFIER, 0); }
		public Subprocess_idContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_subprocess_id; }
	}

	public final Subprocess_idContext subprocess_id() throws RecognitionException {
		Subprocess_idContext _localctx = new Subprocess_idContext(_ctx, getState());
		enterRule(_localctx, 28, RULE_subprocess_id);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(137);
			match(IDENTIFIER);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Role_idContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(binding_grammarParser.IDENTIFIER, 0); }
		public Role_idContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_role_id; }
	}

	public final Role_idContext role_id() throws RecognitionException {
		Role_idContext _localctx = new Role_idContext(_ctx, getState());
		enterRule(_localctx, 30, RULE_role_id);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(139);
			match(IDENTIFIER);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static class Task_idContext extends ParserRuleContext {
		public TerminalNode IDENTIFIER() { return getToken(binding_grammarParser.IDENTIFIER, 0); }
		public Task_idContext(ParserRuleContext parent, int invokingState) {
			super(parent, invokingState);
		}
		@Override public int getRuleIndex() { return RULE_task_id; }
	}

	public final Task_idContext task_id() throws RecognitionException {
		Task_idContext _localctx = new Task_idContext(_ctx, getState());
		enterRule(_localctx, 32, RULE_task_id);
		try {
			enterOuterAlt(_localctx, 1);
			{
			setState(141);
			match(IDENTIFIER);
			}
		}
		catch (RecognitionException re) {
			_localctx.exception = re;
			_errHandler.reportError(this, re);
			_errHandler.recover(this, re);
		}
		finally {
			exitRule();
		}
		return _localctx;
	}

	public static final String _serializedATN =
		"\3\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964\3\26\u0092\4\2\t\2"+
		"\4\3\t\3\4\4\t\4\4\5\t\5\4\6\t\6\4\7\t\7\4\b\t\b\4\t\t\t\4\n\t\n\4\13"+
		"\t\13\4\f\t\f\4\r\t\r\4\16\t\16\4\17\t\17\4\20\t\20\4\21\t\21\4\22\t\22"+
		"\3\2\3\2\3\2\3\3\3\3\3\3\3\3\7\3,\n\3\f\3\16\3/\13\3\3\3\3\3\3\4\3\4\3"+
		"\4\3\4\7\4\67\n\4\f\4\16\4:\13\4\3\4\5\4=\n\4\3\4\3\4\3\5\3\5\5\5C\n\5"+
		"\3\5\3\5\3\5\3\5\5\5I\n\5\3\5\5\5L\n\5\5\5N\n\5\3\6\3\6\3\6\3\6\5\6T\n"+
		"\6\3\6\5\6W\n\6\3\7\3\7\3\7\3\7\3\b\3\b\3\b\3\b\3\b\5\bb\n\b\3\t\3\t\3"+
		"\t\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\3\n\5\nt\n\n\3\13\3"+
		"\13\3\13\3\13\3\f\3\f\3\r\3\r\3\16\3\16\3\16\5\16\u0081\n\16\3\17\3\17"+
		"\3\17\6\17\u0086\n\17\r\17\16\17\u0087\3\17\3\17\3\20\3\20\3\21\3\21\3"+
		"\22\3\22\3\22\2\2\23\2\4\6\b\n\f\16\20\22\24\26\30\32\34\36 \"\2\2\2\u0090"+
		"\2$\3\2\2\2\4\'\3\2\2\2\6\62\3\2\2\2\bM\3\2\2\2\nO\3\2\2\2\fX\3\2\2\2"+
		"\16a\3\2\2\2\20c\3\2\2\2\22s\3\2\2\2\24u\3\2\2\2\26y\3\2\2\2\30{\3\2\2"+
		"\2\32\u0080\3\2\2\2\34\u0085\3\2\2\2\36\u008b\3\2\2\2 \u008d\3\2\2\2\""+
		"\u008f\3\2\2\2$%\5\4\3\2%&\5\6\4\2&\3\3\2\2\2\'(\7\23\2\2(-\5\b\5\2)*"+
		"\7\20\2\2*,\5\b\5\2+)\3\2\2\2,/\3\2\2\2-+\3\2\2\2-.\3\2\2\2.\60\3\2\2"+
		"\2/-\3\2\2\2\60\61\7\24\2\2\61\5\3\2\2\2\62<\7\23\2\2\638\5\n\6\2\64\65"+
		"\7\20\2\2\65\67\5\n\6\2\66\64\3\2\2\2\67:\3\2\2\28\66\3\2\2\289\3\2\2"+
		"\29=\3\2\2\2:8\3\2\2\2;=\3\2\2\2<\63\3\2\2\2<;\3\2\2\2=>\3\2\2\2>?\7\24"+
		"\2\2?\7\3\2\2\2@N\5\f\7\2AC\5\24\13\2BA\3\2\2\2BC\3\2\2\2CD\3\2\2\2DE"+
		"\5\26\f\2EF\7\3\2\2FH\5\30\r\2GI\5\16\b\2HG\3\2\2\2HI\3\2\2\2IK\3\2\2"+
		"\2JL\5\20\t\2KJ\3\2\2\2KL\3\2\2\2LN\3\2\2\2M@\3\2\2\2MB\3\2\2\2N\t\3\2"+
		"\2\2OP\5\26\f\2PQ\7\4\2\2QS\5\30\r\2RT\5\16\b\2SR\3\2\2\2ST\3\2\2\2TV"+
		"\3\2\2\2UW\5\20\t\2VU\3\2\2\2VW\3\2\2\2W\13\3\2\2\2XY\5\32\16\2YZ\7\n"+
		"\2\2Z[\7\7\2\2[\r\3\2\2\2\\]\7\f\2\2]^\7\13\2\2^b\5\22\n\2_`\7\13\2\2"+
		"`b\5\22\n\2a\\\3\2\2\2a_\3\2\2\2b\17\3\2\2\2cd\7\6\2\2de\5\22\n\2e\21"+
		"\3\2\2\2fg\7\21\2\2gh\5\22\n\2hi\7\22\2\2it\3\2\2\2jk\5\32\16\2kl\7\t"+
		"\2\2lm\5\22\n\2mt\3\2\2\2no\5\32\16\2op\7\b\2\2pq\5\22\n\2qt\3\2\2\2r"+
		"t\5\32\16\2sf\3\2\2\2sj\3\2\2\2sn\3\2\2\2sr\3\2\2\2t\23\3\2\2\2uv\7\r"+
		"\2\2vw\5\36\20\2wx\7\16\2\2x\25\3\2\2\2yz\5\32\16\2z\27\3\2\2\2{|\5\32"+
		"\16\2|\31\3\2\2\2}\u0081\5 \21\2~\u0081\5\34\17\2\177\u0081\7\5\2\2\u0080"+
		"}\3\2\2\2\u0080~\3\2\2\2\u0080\177\3\2\2\2\u0081\33\3\2\2\2\u0082\u0083"+
		"\5\36\20\2\u0083\u0084\7\17\2\2\u0084\u0086\3\2\2\2\u0085\u0082\3\2\2"+
		"\2\u0086\u0087\3\2\2\2\u0087\u0085\3\2\2\2\u0087\u0088\3\2\2\2\u0088\u0089"+
		"\3\2\2\2\u0089\u008a\5 \21\2\u008a\35\3\2\2\2\u008b\u008c\7\25\2\2\u008c"+
		"\37\3\2\2\2\u008d\u008e\7\25\2\2\u008e!\3\2\2\2\u008f\u0090\7\25\2\2\u0090"+
		"#\3\2\2\2\17-8<BHKMSVas\u0080\u0087";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}