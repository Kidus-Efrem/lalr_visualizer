# core/lalr_utils.py

from core.Item import Item
from core.grammar import NonTerminal, Terminal
from collections import defaultdict
from core.clr_utils import closure, goto
import logging

logger = logging.getLogger(__name__)

# --------------------------------------------------
# LALR STATE BUILDING
# --------------------------------------------------

def build_LALR_states(grammar):
    # First, build LR(1) states
    from core.clr_utils import build_LR1_states
    lr1_states, lr1_transitions = build_LR1_states(grammar)

    # Group states by their core items (ignoring lookaheads)
    core_to_states = defaultdict(list)
    for sid, state in enumerate(lr1_states):
        # Create core by removing lookaheads
        core = frozenset(Item(item.production, item.dot, None) for item in state)
        core_to_states[core].append(sid)

    # Merge states with same core
    lalr_states = []
    state_mapping = {}  # old_lr1_id -> new_lalr_id
    merged_states = {}  # core -> merged_state

    for core, state_ids in core_to_states.items():
        if len(state_ids) == 1:
            # No merging needed
            merged_state = lr1_states[state_ids[0]]
            merged_states[core] = merged_state
            lalr_states.append(merged_state)
            state_mapping[state_ids[0]] = len(lalr_states) - 1
        else:
            # Merge lookaheads from all states with same core
            merged_items = set()
            for sid in state_ids:
                for item in lr1_states[sid]:
                    merged_items.add(item)  # Keep all lookaheads

            merged_state = merged_items
            merged_states[core] = merged_state
            lalr_states.append(merged_state)

            # Map all original states to this merged state
            for sid in state_ids:
                state_mapping[sid] = len(lalr_states) - 1

    # Build new transitions based on merged states
    lalr_transitions = {}
    for (old_from, sym), old_to in lr1_transitions.items():
        new_from = state_mapping[old_from]
        new_to = state_mapping[old_to]
        lalr_transitions[(new_from, sym)] = new_to

    logger.info(f"[LOG lalr_states_built] ========= Built LALR(1) states: {len(lalr_states)} (merged from {len(lr1_states)} LR(1) states)")

    return lalr_states, lalr_transitions