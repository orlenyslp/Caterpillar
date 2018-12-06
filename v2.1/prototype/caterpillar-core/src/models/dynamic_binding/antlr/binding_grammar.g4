grammar binding_grammar;

/*
 * Parser Rules 
 */

binding_policy 
    : binding_set unbinding_set
    ;

binding_set 
    : LBRACES binding_statement (SEMICOLON binding_statement)* RBRACES 
    ;

unbinding_set
    : LBRACES (unbinding_statement (SEMICOLON unbinding_statement)* | ) RBRACES
    ;

binding_statement
    : is_creator
    | (scope_restriction)? nominator NOMINATES nominee (binding_constr)? (endorsement_constr)?
    ;

unbinding_statement 
    : nominator RELEASES nominee (binding_constr)? (endorsement_constr)?
    ;

is_creator 
    : role IS CASE_CREATOR
    ;

binding_constr  
    : NOT IN set_expresion
    | IN set_expresion
    ;

endorsement_constr 
    : ENDORSED_BY set_expresion 
    ;

set_expresion
    : LPAREN set_expresion RPAREN
    | role OR set_expresion
    | role AND set_expresion
    | role
    ;

scope_restriction 
    : UNDER subprocess_id COMMA;

nominator
    : role ;

nominee
    : role ;

role 
    : (role_id | role_path_expresion | SELF) 
    ;

role_path_expresion 
    : (subprocess_id DOT)+ role_id 
    ;

subprocess_id 
    : IDENTIFIER 
    ;

role_id 
    : IDENTIFIER 
    ;

task_id 
    : IDENTIFIER 
    ;

/*
 * Lexer Rules 
 */

NOMINATES : 'nominates' ;
RELEASES : 'releases' ;
SELF : 'self' ;
ENDORSED_BY : ( 'endorsed-by' | 'endorsers' ) ;
CASE_CREATOR : 'case-creator' ;

AND : 'and';
OR : 'or' ;
IS : 'is' ;
IN : 'in' ;
NOT : 'not';
UNDER : 'Under';

COMMA : ',' ;
DOT : '.' ;
SEMICOLON : ';';

LPAREN : '(' ;
RPAREN : ')' ;
LBRACES : '{' ;
RBRACES : '}' ;

IDENTIFIER : [a-zA-Z_0-9]+ ;

WS : [ \r\t\u000C\n]+ -> skip ;

