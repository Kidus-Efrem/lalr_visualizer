# main.py

from core.Item import Item
from core.grammar import Grammar, NonTerminal, Terminal, Production
from core.clr_utils import closure, build_CLR_states, build_parsing_tables, parse_input, tokenize

def build_local_example_grammar():
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
        Production(T, [T, mul, F]),
        Production(T, [F]),
        Production(F, [lpar, E, rpar]),
        Production(F, [id])
    ]
    grammar = Grammar(start_symbol=E, productions=productions)
    dollar = Terminal("$")
    grammar.augment()
    grammar.terminals.add(dollar)
    grammar.compute_first()
    return grammar


def build_custom_grammar():
    print("Enter your grammar:")

    nts_input = input("Non-terminals (comma-separated, e.g., E,T,F): ").strip()
    nts_names = [x.strip() for x in nts_input.split(",")]
    non_terminals = {name: NonTerminal(name) for name in nts_names}

    ts_input = input("Terminals (comma-separated, e.g., id,+,*,(,)): ").strip()
    term_names = [x.strip() for x in ts_input.split(",")]
    terminals = {name: Terminal(name) for name in term_names}

    start_name = input(f"Start symbol (one of {nts_names}): ").strip()
    start_symbol = non_terminals[start_name]

    print("Enter productions (use | for alternatives). Format: LHS -> RHS1 | RHS2 | ...")
    productions = []
    while True:
        line = input().strip()
        if line == "":
            break
        lhs, rhs = line.split("->")
        lhs = lhs.strip()
        rhs_alternatives = [alt.strip() for alt in rhs.split("|")]
        for alt in rhs_alternatives:
            rhs_syms = []
            for sym in alt.split():
                if sym in non_terminals:
                    rhs_syms.append(non_terminals[sym])
                elif sym in terminals:
                    rhs_syms.append(terminals[sym])
                elif sym == "ε":
                    continue
                else:
                    print(f"Unknown symbol: {sym}, treating as terminal")
                    rhs_syms.append(Terminal(sym))
            productions.append(Production(non_terminals[lhs], rhs_syms))

    grammar = Grammar(start_symbol=start_symbol, productions=productions)
    dollar = Terminal("$")
    grammar.augment()
    grammar.terminals.add(dollar)
    grammar.compute_first()
    return grammar


if __name__ == "__main__":
    print("LALR Visualizer")
    choice = input("Use local example grammar? (y/n): ").strip().lower()

    if choice == "y":
        grammar = build_local_example_grammar()
    else:
        grammar = build_custom_grammar()

    print("\nStart symbol:", grammar.start_symbol)
    grammar.print()
    grammar.print_first()

    # Build LALR parser
    star_prod = grammar.productions[0]
    star_item = Item(star_prod, dot=0, lookahead=Terminal('$'))
    items = closure({star_item}, grammar)

    states, transitions = build_LALR_states(grammar)
    print("\nStates:\n")
    for i, state in enumerate(states):
        print(f"State {i}")
        for item in state:
            print(f"  {item}")
        print()

    ACTION, GOTO = build_parsing_tables(states, transitions, grammar)

    print("\nACTION TABLE")
    for (state, term), action in sorted(ACTION.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        print(f"({state}, {term}) → {action}")

    print("\nGOTO TABLE")
    for (state, nt), next_state in sorted(GOTO.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        print(f"({state}, {nt}) → {next_state}")

    # ---------------- Multiple inputs ----------------
    print("\nEnter strings to parse (type 'exit' to quit):")
    while True:
        raw_input_str = input("Input string: ").strip()
        if raw_input_str.lower() == "exit":
            print("Exiting...")
            break

        try:
            input_tokens = tokenize(raw_input_str, grammar.terminals)
            parse_input(input_tokens, ACTION, GOTO, grammar)
        except ValueError as e:
            print("Error tokenizing input:", e)
