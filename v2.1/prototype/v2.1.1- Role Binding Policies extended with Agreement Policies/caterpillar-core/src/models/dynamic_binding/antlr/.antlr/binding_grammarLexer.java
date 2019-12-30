// Generated from c:\BackUp\Research\00\caterpillar\Prototype\caterpillar-core\src\models\dynamic_binding\antlr\binding_grammar.g4 by ANTLR 4.7.1
import org.antlr.v4.runtime.Lexer;
import org.antlr.v4.runtime.CharStream;
import org.antlr.v4.runtime.Token;
import org.antlr.v4.runtime.TokenStream;
import org.antlr.v4.runtime.*;
import org.antlr.v4.runtime.atn.*;
import org.antlr.v4.runtime.dfa.DFA;
import org.antlr.v4.runtime.misc.*;

@SuppressWarnings({"all", "warnings", "unchecked", "unused", "cast"})
public class binding_grammarLexer extends Lexer {
	static { RuntimeMetaData.checkVersion("4.7.1", RuntimeMetaData.VERSION); }

	protected static final DFA[] _decisionToDFA;
	protected static final PredictionContextCache _sharedContextCache =
		new PredictionContextCache();
	public static final int
		NOMINATES=1, RELEASES=2, SELF=3, ENDORSED_BY=4, CASE_CREATOR=5, AND=6, 
		OR=7, IS=8, IN=9, NOT=10, UNDER=11, COMMA=12, DOT=13, SEMICOLON=14, LPAREN=15, 
		RPAREN=16, LBRACES=17, RBRACES=18, IDENTIFIER=19, WS=20;
	public static String[] channelNames = {
		"DEFAULT_TOKEN_CHANNEL", "HIDDEN"
	};

	public static String[] modeNames = {
		"DEFAULT_MODE"
	};

	public static final String[] ruleNames = {
		"NOMINATES", "RELEASES", "SELF", "ENDORSED_BY", "CASE_CREATOR", "AND", 
		"OR", "IS", "IN", "NOT", "UNDER", "COMMA", "DOT", "SEMICOLON", "LPAREN", 
		"RPAREN", "LBRACES", "RBRACES", "IDENTIFIER", "WS"
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


	public binding_grammarLexer(CharStream input) {
		super(input);
		_interp = new LexerATNSimulator(this,_ATN,_decisionToDFA,_sharedContextCache);
	}

	@Override
	public String getGrammarFileName() { return "binding_grammar.g4"; }

	@Override
	public String[] getRuleNames() { return ruleNames; }

	@Override
	public String getSerializedATN() { return _serializedATN; }

	@Override
	public String[] getChannelNames() { return channelNames; }

	@Override
	public String[] getModeNames() { return modeNames; }

	@Override
	public ATN getATN() { return _ATN; }

	public static final String _serializedATN =
		"\3\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964\2\26\u0097\b\1\4\2"+
		"\t\2\4\3\t\3\4\4\t\4\4\5\t\5\4\6\t\6\4\7\t\7\4\b\t\b\4\t\t\t\4\n\t\n\4"+
		"\13\t\13\4\f\t\f\4\r\t\r\4\16\t\16\4\17\t\17\4\20\t\20\4\21\t\21\4\22"+
		"\t\22\4\23\t\23\4\24\t\24\4\25\t\25\3\2\3\2\3\2\3\2\3\2\3\2\3\2\3\2\3"+
		"\2\3\2\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\3\4\3\4\3\4\3\4\3\4\3\5\3\5"+
		"\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3\5\3"+
		"\5\5\5X\n\5\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\6\3\7\3"+
		"\7\3\7\3\7\3\b\3\b\3\b\3\t\3\t\3\t\3\n\3\n\3\n\3\13\3\13\3\13\3\13\3\f"+
		"\3\f\3\f\3\f\3\f\3\f\3\r\3\r\3\16\3\16\3\17\3\17\3\20\3\20\3\21\3\21\3"+
		"\22\3\22\3\23\3\23\3\24\6\24\u008d\n\24\r\24\16\24\u008e\3\25\6\25\u0092"+
		"\n\25\r\25\16\25\u0093\3\25\3\25\2\2\26\3\3\5\4\7\5\t\6\13\7\r\b\17\t"+
		"\21\n\23\13\25\f\27\r\31\16\33\17\35\20\37\21!\22#\23%\24\'\25)\26\3\2"+
		"\4\6\2\62;C\\aac|\5\2\13\f\16\17\"\"\2\u0099\2\3\3\2\2\2\2\5\3\2\2\2\2"+
		"\7\3\2\2\2\2\t\3\2\2\2\2\13\3\2\2\2\2\r\3\2\2\2\2\17\3\2\2\2\2\21\3\2"+
		"\2\2\2\23\3\2\2\2\2\25\3\2\2\2\2\27\3\2\2\2\2\31\3\2\2\2\2\33\3\2\2\2"+
		"\2\35\3\2\2\2\2\37\3\2\2\2\2!\3\2\2\2\2#\3\2\2\2\2%\3\2\2\2\2\'\3\2\2"+
		"\2\2)\3\2\2\2\3+\3\2\2\2\5\65\3\2\2\2\7>\3\2\2\2\tW\3\2\2\2\13Y\3\2\2"+
		"\2\rf\3\2\2\2\17j\3\2\2\2\21m\3\2\2\2\23p\3\2\2\2\25s\3\2\2\2\27w\3\2"+
		"\2\2\31}\3\2\2\2\33\177\3\2\2\2\35\u0081\3\2\2\2\37\u0083\3\2\2\2!\u0085"+
		"\3\2\2\2#\u0087\3\2\2\2%\u0089\3\2\2\2\'\u008c\3\2\2\2)\u0091\3\2\2\2"+
		"+,\7p\2\2,-\7q\2\2-.\7o\2\2./\7k\2\2/\60\7p\2\2\60\61\7c\2\2\61\62\7v"+
		"\2\2\62\63\7g\2\2\63\64\7u\2\2\64\4\3\2\2\2\65\66\7t\2\2\66\67\7g\2\2"+
		"\678\7n\2\289\7g\2\29:\7c\2\2:;\7u\2\2;<\7g\2\2<=\7u\2\2=\6\3\2\2\2>?"+
		"\7u\2\2?@\7g\2\2@A\7n\2\2AB\7h\2\2B\b\3\2\2\2CD\7g\2\2DE\7p\2\2EF\7f\2"+
		"\2FG\7q\2\2GH\7t\2\2HI\7u\2\2IJ\7g\2\2JK\7f\2\2KL\7/\2\2LM\7d\2\2MX\7"+
		"{\2\2NO\7g\2\2OP\7p\2\2PQ\7f\2\2QR\7q\2\2RS\7t\2\2ST\7u\2\2TU\7g\2\2U"+
		"V\7t\2\2VX\7u\2\2WC\3\2\2\2WN\3\2\2\2X\n\3\2\2\2YZ\7e\2\2Z[\7c\2\2[\\"+
		"\7u\2\2\\]\7g\2\2]^\7/\2\2^_\7e\2\2_`\7t\2\2`a\7g\2\2ab\7c\2\2bc\7v\2"+
		"\2cd\7q\2\2de\7t\2\2e\f\3\2\2\2fg\7c\2\2gh\7p\2\2hi\7f\2\2i\16\3\2\2\2"+
		"jk\7q\2\2kl\7t\2\2l\20\3\2\2\2mn\7k\2\2no\7u\2\2o\22\3\2\2\2pq\7k\2\2"+
		"qr\7p\2\2r\24\3\2\2\2st\7p\2\2tu\7q\2\2uv\7v\2\2v\26\3\2\2\2wx\7W\2\2"+
		"xy\7p\2\2yz\7f\2\2z{\7g\2\2{|\7t\2\2|\30\3\2\2\2}~\7.\2\2~\32\3\2\2\2"+
		"\177\u0080\7\60\2\2\u0080\34\3\2\2\2\u0081\u0082\7=\2\2\u0082\36\3\2\2"+
		"\2\u0083\u0084\7*\2\2\u0084 \3\2\2\2\u0085\u0086\7+\2\2\u0086\"\3\2\2"+
		"\2\u0087\u0088\7}\2\2\u0088$\3\2\2\2\u0089\u008a\7\177\2\2\u008a&\3\2"+
		"\2\2\u008b\u008d\t\2\2\2\u008c\u008b\3\2\2\2\u008d\u008e\3\2\2\2\u008e"+
		"\u008c\3\2\2\2\u008e\u008f\3\2\2\2\u008f(\3\2\2\2\u0090\u0092\t\3\2\2"+
		"\u0091\u0090\3\2\2\2\u0092\u0093\3\2\2\2\u0093\u0091\3\2\2\2\u0093\u0094"+
		"\3\2\2\2\u0094\u0095\3\2\2\2\u0095\u0096\b\25\2\2\u0096*\3\2\2\2\6\2W"+
		"\u008e\u0093\3\b\2\2";
	public static final ATN _ATN =
		new ATNDeserializer().deserialize(_serializedATN.toCharArray());
	static {
		_decisionToDFA = new DFA[_ATN.getNumberOfDecisions()];
		for (int i = 0; i < _ATN.getNumberOfDecisions(); i++) {
			_decisionToDFA[i] = new DFA(_ATN.getDecisionState(i), i);
		}
	}
}