grammar binding_grammar;

/*
 * Parser Rules 
 */

agreement_policy 
    : LBRACES agreement_statement (SEMICOLON agreement_statement)* RBRACES 
    ;

agreement_statement
    : (scope_restriction)? role PROPOSES ACTION ON cflow_element (endorsement_constr)?
    ;

endorsement_constr 
    : ENDORSED_BY set_expresion 
    | WITH voting_ratio VOTES (BY (role_list | ALL))? 
    ;

role_list 
    : role (COMMA role_list)* 
    ;

set_expresion
    : LPAREN set_expresion RPAREN
    | role OR set_expresion
    | role AND set_expresion
    | role
    ;

voting_ratio 
    :  ZERO DOT DIGITS 
    |  ONE DOT ZERO
    ;

scope_restriction 
    : UNDER subprocess_id COMMA;

cflow_element
    : (element_id | element_path_expression)
    ;

element_path_expression
    : (subprocess_id DOT)+ element_id
    ;

role 
    : (role_id | role_path_expresion) 
    ;

role_path_expresion 
    : (subprocess_id DOT)+ role_id 
    ;

subprocess_id 
    : IDENTIFIER 
    ;

element_id
    : IDENTIFIER
    ;

role_id 
    : IDENTIFIER 
    ;


/*
 * Lexer Rules 
 */

PROPOSES : 'proposes' ;
ACTION : ('link-process' | 'link-role' | 'choose-path') ;
ENDORSED_BY : ( 'endorsed-by' | 'endorsers' ) ;
WITH : 'with' ;
VOTES : 'votes' ;
BY : 'by' ;

AND : 'and';
OR : 'or' ;
ON : 'on' ;
UNDER : 'Under';

COMMA : ',' ;
DOT : '.' ;
SEMICOLON : ';';
ALL : '*' ;

LPAREN : '(' ;
RPAREN : ')' ;
LBRACES : '{' ;
RBRACES : '}' ;

IDENTIFIER : [a-zA-Z_0-9]+ ;
ZERO : '0' ;
ONE : '1' ;
DIGITS: [0-9]+ ;

WS : [ \r\t\u000C\n]+ -> skip ;

