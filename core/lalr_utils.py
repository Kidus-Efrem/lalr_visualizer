# core/lalr_utils.py

from core.Item import Item
from core.grammar import NonTerminal, Terminal

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
                        beta_lookahead = beta + ([item.lookahead] if item.lookahead else [])
                        first_set = compute_first_sequence(grammar, beta_lookahead)
                        for la in first_set:
                            new_item = Item(prod, dot=0, lookahead=la)
                            if new_item not in closure_set:
                                new_items.add(new_item)

        if new_items:
            closure_set.update(new_items)
            added = True

    return closure_set


def compute_first_sequence(grammar, symbols):
    result = set()
    for sym in symbols:
        result.update(grammar.first[sym] - set(['ε']))
        if 'ε' not in grammar.first[sym]:
            return result
    result.add('ε')
    return result


def goto(items: set, symbol, grammar):
    moved_items = set()
    for item in items:
        if item.next_symbol() == symbol:
            moved_items.add(item.advance_dot())
    return closure(moved_items, grammar)


def build_LALR_states(grammar):
    start_prod = grammar.productions[0]
    start_item = Item(start_prod, dot=0, lookahead=Terminal('$'))
    start_state = closure({start_item}, grammar)

    states = [start_state]
    state_ids = {frozenset(start_state): 0}
    transitions = {}

    changed = True
    while changed:
        changed = False
        new_states = []

        for i, state in enumerate(states):
            symbols = set(item.next_symbol() for item in state if item.next_symbol() is not None)
            for sym in symbols:
                next_state = goto(state, sym, grammar)
                if not next_state:
                    continue
                fs = frozenset(next_state)
                if fs not in state_ids:
                    state_ids[fs] = len(states) + len(new_states)
                    new_states.append(next_state)
                transitions[(i, sym)] = state_ids[fs]

        if new_states:
            states.extend(new_states)
            changed = True

    return states, transitions


def build_parsing_tables(states, transitions, grammar):
    ACTION = {}
    GOTO = {}

    for state_id, state in enumerate(states):
        for item in state:
            if item.is_complete():
                if item.production.left.name == grammar.start_symbol.name:
                    ACTION[(state_id, Terminal('$'))] = 'ACC'
                else:
                    for la in [item.lookahead]:
                        ACTION[(state_id, la)] = f"R({item.production})"
            else:
                sym = item.next_symbol()
                next_state = transitions.get((state_id, sym))
                if isinstance(sym, Terminal):
                    if next_state is not None:
                        ACTION[(state_id, sym)] = f"S({next_state})"
                elif isinstance(sym, NonTerminal):
                    if next_state is not None:
                        GOTO[(state_id, sym)] = next_state
    return ACTION, GOTO


def parse_input(input_tokens, ACTION, GOTO, grammar):
    stack = [0]
    pointer = 0
    input_tokens.append(Terminal('$'))

    print("\nParsing steps:\n")
    while True:
        state = stack[-1]
        current_token = input_tokens[pointer]
        action = ACTION.get((state, current_token))

        if action is None:
            print(f"Error: no action for state {state} with input {current_token}")
            return False

        if action.startswith('S'):
            next_state = int(action[2:-1])
            stack.append(next_state)
            pointer += 1
            print(f"Shift {current_token}, push state {next_state}")

        elif action.startswith('R'):
            prod_str = action[2:-1]
            left_side, right_side = prod_str.split('→')
            left_side = left_side.strip()
            right_symbols = right_side.strip().split()

            for _ in right_symbols:
                if _ != 'ε':
                    stack.pop()

            top_state = stack[-1]
            nt = NonTerminal(left_side)
            goto_state = GOTO.get((top_state, nt))
            if goto_state is None:
                print(f"Error: no GOTO for state {top_state} with {nt}")
                return False

            stack.append(goto_state)
            print(f"Reduce by {prod_str}, push state {goto_state}")

        elif action == 'ACC':
            print("Input string accepted!")
            return True


def tokenize(input_string, terminals):
    tokens = []
    i = 0
    while i < len(input_string):
        c = input_string[i]

        if c.isspace():
            i += 1
            continue

        # identifier
        elif c.isalpha():
            j = i
            while j < len(input_string) and input_string[j].isalnum():
                j += 1
            token_str = input_string[i:j]
            if "id" in [str(t) for t in terminals]:
                tokens.append(Terminal("id"))
            else:
                tokens.append(Terminal(token_str))
            i = j

        # check if symbol is in grammar terminals
        elif any(input_string.startswith(str(t), i) for t in terminals):
            match = max((str(t) for t in terminals if input_string.startswith(str(t), i)), key=len)
            tokens.append(Terminal(match))
            i += len(match)

        else:
            tokens.append(Terminal(c))
            i += 1

    tokens.append(Terminal("$"))
    return tokens
