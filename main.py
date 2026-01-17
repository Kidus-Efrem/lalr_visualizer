from core.Item import Item
from core.grammar import Grammar, NonTerminal, Terminal, Production
from core.lalr_utils import closure, goto, build_LALR_states


E = NonTerminal('E')
T = NonTerminal('T')
F = NonTerminal('F')

plus = Terminal('+')
mul = Terminal('*')
lpar = Terminal('(')
rpar = Terminal(')')
id = Terminal("id")

productions = [
	Production(E, [E, plus, T]),
	Production(E, [T]),
	Production(T, [T, mul , F]),
	Production(T, [F]),
	Production(F, [lpar, E, rpar]),
	Production(F, [id])]
grammar = Grammar(start_symbol = E, productions = productions)

dollar= Terminal("$")
grammar.print()
grammar.augment()
grammar.print()
grammar.terminals.add(dollar)

grammar.compute_first()

grammar.print_first()
star_prod = grammar.productions[0]
star_item= Item(star_prod, dot = 0 , lookahead = Terminal('$'))
items = closure({star_item}, grammar)
for it in items:
	print(it)

states, transitions = build_LALR_states(grammar)

# Print states
for i, state in enumerate(states):
    print(f"\nState {i}:")
    for item in state:
        print(f"  {item}")

# Print transitions
print("\nTransitions:")
for (from_id, sym), to_id in transitions.items():
    print(f"State {from_id} --{sym}--> State {to_id}")
