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
