# core/clr_utils.py

from core.Item import Item
from core.grammar import NonTerminal, Terminal
from collections import defaultdict

# --------------------------------------------------
# CLOSURE (LR(1))
# --------------------------------------------------

def closure(items: set, grammar):
    closure_set = set(items)
    added = True

    while added:
        added = False
        new_items = set()

        for item in closure_set:
            next_sym = item.next_symbol()
            if isinstance(next_sym, NonTerminal):
                for prod in grammar.productions:
                    if prod.left == next_sym:
                        beta = item.production.right[item.dot + 1:]
                        beta_lookahead = beta + [item.lookahead]
                        first_set = compute_first_sequence(grammar, beta_lookahead)

                        for la in first_set:
                            new_item = Item(prod, 0, la)
                            if new_item not in closure_set:
                                new_items.add(new_item)

        if new_items:
            closure_set |= new_items
            added = True

    return closure_set


def compute_first_sequence(grammar, symbols):
    result = set()
    for sym in symbols:
        result |= grammar.first[sym] - {'ε'}
        if 'ε' not in grammar.first[sym]:
            return result
    result.add('ε')
    return result


# --------------------------------------------------
# GOTO
# --------------------------------------------------

def goto(items, symbol, grammar):
    moved = set()
    for item in items:
        if item.next_symbol() == symbol:
            moved.add(item.advance_dot())
    return closure(moved, grammar)


# --------------------------------------------------
# BUILD CANONICAL LR(1) STATES
# --------------------------------------------------

def build_LR1_states(grammar):
    start_prod = grammar.productions[0]
    start_item = Item(start_prod, 0, Terminal('$'))
    start_state = closure({start_item}, grammar)

    states = [start_state]
    state_ids = {frozenset(start_state): 0}
    transitions = {}

    i = 0
    while i < len(states):
        state = states[i]
        symbols = {item.next_symbol() for item in state if item.next_symbol()}

        for sym in symbols:
            next_state = goto(state, sym, grammar)
            fs = frozenset(next_state)

            if fs not in state_ids:
                state_ids[fs] = len(states)
                states.append(next_state)

            transitions[(i, sym)] = state_ids[fs]

        i += 1

    return states, transitions


# --------------------------------------------------
# PUBLIC ENTRY POINT
# --------------------------------------------------

def build_CLR_states(grammar):
    clr_states, clr_transitions = build_LR1_states(grammar)
    print("\n[INFO] Built canonical LR(1) states:", len(clr_states))

    return clr_states, clr_transitions


# --------------------------------------------------
# PARSING TABLES
# --------------------------------------------------

def build_parsing_tables(states, transitions, grammar):
    ACTION = {}
    GOTO = {}

    for sid, state in enumerate(states):
        for item in state:
            if item.is_complete():
                if item.production.left == grammar.start_symbol:
                    ACTION[(sid, Terminal('$'))] = 'ACC'
                else:
                    ACTION[(sid, item.lookahead)] = f"R({item.production})"
            else:
                sym = item.next_symbol()
                target = transitions.get((sid, sym))
                if isinstance(sym, Terminal) and target is not None:
                    ACTION[(sid, sym)] = f"S({target})"
                elif isinstance(sym, NonTerminal) and target is not None:
                    GOTO[(sid, sym)] = target

    return ACTION, GOTO


# --------------------------------------------------
# PARSER
# --------------------------------------------------

def parse_input(tokens, ACTION, GOTO, grammar):
    state_stack = [0]
    symbol_stack = []  # Track symbols for clarity
    i = 0

    print("\nParsing steps:")
    while True:
        state = state_stack[-1]
        token = tokens[i]

        action = ACTION.get((state, token))
        if action is None:
            print(f"❌ Error at state {state}, token {token}")
            return False

        # Print current state with symbols
        remaining_input = ' '.join(str(t) for t in tokens[i:])
        symbols_display = ' '.join(symbol_stack) if symbol_stack else 'ε'
        print(f"Stack: {symbols_display} | Input: {remaining_input} | Action: ", end="")

        if action.startswith("S"):
            ns = int(action[2:-1])
            state_stack.append(ns)
            symbol_stack.append(str(token))
            i += 1
            print(f"Shift {token}, push {ns}")

        elif action.startswith("R"):
            prod = action[2:-1]
            lhs, rhs = prod.split("→")
            rhs_len = len(rhs.strip().split()) if rhs.strip() else 0

            # Pop symbols and states
            for _ in range(rhs_len):
                if symbol_stack:
                    symbol_stack.pop()
                state_stack.pop()

            # Push the reduced non-terminal
            symbol_stack.append(lhs.strip())
            top = state_stack[-1]
            goto = GOTO.get((top, NonTerminal(lhs.strip())))
            state_stack.append(goto)
            print(f"Reduce {prod}, goto {goto}")

        elif action == "ACC":
            print("✅ Input accepted")
            return True


# --------------------------------------------------
# TOKENIZER
# --------------------------------------------------

def tokenize(input_string, terminals):
    tokens = []
    i = 0
    terminal_strings = sorted([str(t) for t in terminals], key=len, reverse=True)

    while i < len(input_string):
        if input_string[i].isspace():
            i += 1
            continue

        if input_string[i].isalpha():
            j = i
            while j < len(input_string) and input_string[j].isalnum():
                j += 1
            tokens.append(Terminal("id"))
            i = j
            continue

        matched = False
        for t in terminal_strings:
            if input_string.startswith(t, i):
                tokens.append(Terminal(t))
                i += len(t)
                matched = True
                break

        if not matched:
            tokens.append(Terminal(input_string[i]))
            i += 1

    tokens.append(Terminal("$"))
    return tokens
