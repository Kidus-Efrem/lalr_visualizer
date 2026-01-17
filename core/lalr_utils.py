# core/lalr_utils.py

from core.Item import Item
from core.grammar import NonTerminal, Terminal

def closure(items: set, grammar):
    """
    Compute the LR(1) closure of a set of items.
    grammar: your Grammar object (with productions and FIRST sets)
    """
    closure_set = set(items)
    added = True

    while added:
        added = False
        new_items = set()

        for item in closure_set:
            next_sym = item.next_symbol()
            if isinstance(next_sym, NonTerminal):
                # For each production of the non-terminal
                for prod in grammar.productions:
                    if prod.left == next_sym:
                        # Compute lookahead for LR(1)
                        beta = item.production.right[item.dot + 1:]
                        # Compute FIRST(beta + lookahead)
                        if item.lookahead:
                            beta_lookahead = beta + [item.lookahead]
                        else:
                            beta_lookahead = beta
                        # For simplicity, take all terminals in FIRST(beta_lookahead)
                        # (We'll refine later)
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
    """
    Compute FIRST of a sequence of symbols (β + lookahead)
    Returns a set of terminals (or 'ε')
    """
    result = set()
    for sym in symbols:
        result.update(grammar.first[sym] - set(['ε']))
        if 'ε' not in grammar.first[sym]:
            return result
    result.add('ε')
    return result
def goto(items: set, symbol, grammar):
    """
    Compute GOTO(I, X): items after reading symbol X
    """
    moved_items = set()

    for item in items:
        next_sym = item.next_symbol()
        if next_sym == symbol:
            moved_items.add(item.advance_dot())

    return closure(moved_items, grammar)

def build_LALR_states(grammar):
    """
    Build all LR(1) states from augmented grammar
    Returns: list of sets of items (states), transitions dict
    """
    start_prod = grammar.productions[0]  # S' → S
    dollar = Terminal('$')
    start_item = Item(start_prod, dot=0, lookahead=dollar)
    start_state = closure({start_item}, grammar)

    states = [start_state]
    state_ids = {frozenset(start_state): 0}
    transitions = {}  # (state_id, symbol) -> next_state_id

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
                    # New state
                    state_ids[fs] = len(states) + len(new_states)
                    new_states.append(next_state)

                transitions[(i, sym)] = state_ids[fs]

        if new_states:
            states.extend(new_states)
            changed = True

    return states, transitions
def build_parsing_tables(states, transitions, grammar):
    """
    Build ACTION and GOTO tables for LALR parser
    Returns:
        ACTION: dict of (state, terminal) -> action
        GOTO: dict of (state, nonterminal) -> next_state
    """
    ACTION = {}
    GOTO = {}

    for state_id, state in enumerate(states):
        for item in state:
            # Completed item → reduce or accept
            if item.is_complete():
                if item.production.left.name == grammar.start_symbol.name:
                    # Accept
                    ACTION[(state_id, Terminal('$'))] = 'ACC'
                else:
                    # Reduce by this production
                    for la in [item.lookahead]:
                        ACTION[(state_id, la)] = f"R({item.production})"

            # Not complete → shift
            else:
                sym = item.next_symbol()
                if isinstance(sym, Terminal):
                    next_state = transitions.get((state_id, sym))
                    if next_state is not None:
                        ACTION[(state_id, sym)] = f"S({next_state})"
                elif isinstance(sym, NonTerminal):
                    next_state = transitions.get((state_id, sym))
                    if next_state is not None:
                        GOTO[(state_id, sym)] = next_state

    return ACTION, GOTO
def parse_input(input_tokens, ACTION, GOTO, grammar):
    """
    Parse a list of input tokens using the ACTION and GOTO tables
    input_tokens: list of Terminals (include $ at the end)
    """
    stack = [0]  # start with state 0
    pointer = 0  # position in input
    input_tokens.append(Terminal('$'))  # ensure end marker

    print("Parsing steps:\n")
    while True:
        state = stack[-1]
        current_token = input_tokens[pointer]
        action = ACTION.get((state, current_token))

        if action is None:
            print(f"Error: no action for state {state} with input {current_token}")
            return False

        if action.startswith('S'):
            # Shift
            next_state = int(action[2:-1])
            stack.append(next_state)
            pointer += 1
            print(f"Shift {current_token}, push state {next_state}")
        elif action.startswith('R'):
            # Reduce
            # Extract production from string
            prod_str = action[2:-1]
            left_side, right_side = prod_str.split('→')
            left_side = left_side.strip()
            right_symbols = right_side.strip().split()

            # Pop states equal to RHS length
            for _ in right_symbols:
                if _ != 'ε':  # ignore epsilon
                    stack.pop()

            # Push next state from GOTO table
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
def tokenize(input_string):
    """
    Convert a raw input string into a list of Terminals.
    Recognizes: id, +, *, (, )
    Ignores spaces.
    """
    tokens = []
    i = 0
    while i < len(input_string):
        c = input_string[i]

        if c.isspace():
            i += 1
            continue
        elif c.isalpha():  # assuming all variable names are 'id'
            # consume full identifier (e.g., id)
            j = i
            while j < len(input_string) and input_string[j].isalnum():
                j += 1
            token_str = input_string[i:j]
            if token_str == "id":
                tokens.append(Terminal("id"))
            else:
                raise ValueError(f"Unknown identifier: {token_str}")
            i = j
        elif c in '+*()':
            tokens.append(Terminal(c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c}")
    return tokens
