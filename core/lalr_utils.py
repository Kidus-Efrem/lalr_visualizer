# core/lalr_utils.py

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
# TRUE LALR MERGING
# --------------------------------------------------

def merge_LALR_states(lr1_states, lr1_transitions):
    core_map = defaultdict(list)

    # Group states by LR(0) core
    for idx, state in enumerate(lr1_states):
        core = frozenset((item.production, item.dot) for item in state)
        core_map[core].append(idx)

    lalr_states = []
    state_map = {}  # LR(1) state → LALR state id

    for new_id, (_, state_indices) in enumerate(core_map.items()):
        merged_items = {}

        for idx in state_indices:
            for item in lr1_states[idx]:
                key = (item.production, item.dot)
                if key not in merged_items:
                    merged_items[key] = set()
                merged_items[key].add(item.lookahead)

        merged_state = set()
        for (prod, dot), lookaheads in merged_items.items():
            for la in lookaheads:
                merged_state.add(Item(prod, dot, la))

        lalr_states.append(merged_state)

        for old_id in state_indices:
            state_map[old_id] = new_id

    # Remap transitions
    lalr_transitions = {}
    for (old_state, sym), old_target in lr1_transitions.items():
        s = state_map[old_state]
        t = state_map[old_target]
        lalr_transitions[(s, sym)] = t

    return lalr_states, lalr_transitions


# --------------------------------------------------
# PUBLIC ENTRY POINT
# --------------------------------------------------

def build_LALR_states(grammar):
    lr1_states, lr1_transitions = build_LR1_states(grammar)
    print("\n[INFO] Built canonical LR(1) states:", len(lr1_states))

    lalr_states, lalr_transitions = merge_LALR_states(lr1_states, lr1_transitions)
    print("[INFO] After LALR merging:", len(lalr_states))

    return lalr_states, lalr_transitions


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
    stack = [0]
    i = 0

    print("\nParsing steps:")
    while True:
        state = stack[-1]
        token = tokens[i]

        action = ACTION.get((state, token))
        if action is None:
            print(f"❌ Error at state {state}, token {token}")
            return False

        if action.startswith("S"):
            ns = int(action[2:-1])
            stack.append(ns)
            i += 1
            print(f"Shift {token}, push {ns}")

        elif action.startswith("R"):
            prod = action[2:-1]
            lhs, rhs = prod.split("→")
            rhs_len = len(rhs.strip().split()) if rhs.strip() else 0

            for _ in range(rhs_len):
                stack.pop()

            top = stack[-1]
            goto = GOTO.get((top, NonTerminal(lhs.strip())))
            stack.append(goto)
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
