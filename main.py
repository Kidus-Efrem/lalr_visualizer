from core.Item import Item
from core.grammar import Grammar, NonTerminal, Terminal, Production
from core.lalr_utils import (
    closure, build_LALR_states, build_parsing_tables, parse_input, tokenize
)


def build_local_example_grammar():
    # ---------------- Local Example Grammar ----------------
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

    # 1️⃣ Non-terminals
    nts_input = input("Non-terminals (comma-separated, e.g., E,T,F): ").strip()
    nts_names = [x.strip() for x in nts_input.split(",")]
    non_terminals = {name: NonTerminal(name) for name in nts_names}

    # 2️⃣ Terminals
    ts_input = input("Terminals (comma-separated, e.g., id,+,*,(,)): ").strip()
    term_names = [x.strip() for x in ts_input.split(",")]
    terminals = {name: Terminal(name) for name in term_names}

    # 3️⃣ Start symbol
    start_name = input(f"Start symbol (one of {nts_names}): ").strip()
    start_symbol = non_terminals[start_name]

    # 4️⃣ Productions
    print("Enter productions one per line (format: LHS -> RHS symbols separated by space). Enter empty line to finish.")
    productions = []
    while True:
        line = input().strip()
        if line == "":
            break
        lhs, rhs = line.split("->")
        lhs = lhs.strip()
        rhs_syms = []
        for sym in rhs.strip().split():
            if sym in non_terminals:
                rhs_syms.append(non_terminals[sym])
            elif sym in terminals:
                rhs_syms.append(terminals[sym])
            elif sym == "ε":  # epsilon
                continue
            else:
                print(f"Unknown symbol: {sym}, treating as terminal")
                rhs_syms.append(Terminal(sym))
        productions.append(Production(non_terminals[lhs], rhs_syms))

    # 5️⃣ Build Grammar
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
        raw_input = "(id + id) * id"  # default example
    else:
        grammar = build_custom_grammar()
        raw_input = input("Enter expression to parse: ").strip()

    # ---------------- Build LALR Parser ----------------
    star_prod = grammar.productions[0]
    star_item = Item(star_prod, dot=0, lookahead=Terminal('$'))
    items = closure({star_item}, grammar)

    states, transitions = build_LALR_states(grammar)
    ACTION, GOTO = build_parsing_tables(states, transitions, grammar)

    # ---------------- Print Tables ----------------
    print("\nACTION TABLE:")
    for (state, term), action in sorted(ACTION.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        print(f"State {state}, Terminal {term}: {action}")

    print("\nGOTO TABLE:")
    for (state, nt), next_state in sorted(GOTO.items(), key=lambda x: (x[0][0], str(x[0][1]))):
        print(f"State {state}, NonTerminal {nt}: {next_state}")

    # ---------------- Parse Input ----------------
    try:
        input_tokens = tokenize(raw_input)
        parse_input(input_tokens, ACTION, GOTO, grammar)
    except ValueError as e:
        print("Error tokenizing input:", e)
