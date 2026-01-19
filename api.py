from flask import Flask, request, jsonify
from flask_cors import CORS
from core.Item import Item
from core.grammar import Grammar, NonTerminal, Terminal, Production
from core.clr_utils import closure, build_CLR_states, build_parsing_tables, parse_input, tokenize
from core.lalr_utils import build_LALR_states
import io
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

current_grammar = None
current_clr_states = None
current_clr_transitions = None
current_lalr_states = None
current_lalr_transitions = None
current_ACTION = None
current_GOTO = None

def serialize_grammar(grammar):
    return {
        'start_symbol': str(grammar.start_symbol),
        'productions': [str(prod) for prod in grammar.productions],
        'non_terminals': [str(nt) for nt in grammar.non_terminals],
        'terminals': [str(t) for t in grammar.terminals]
    }

def serialize_first_sets(grammar):
    return {str(sym): [str(t) for t in grammar.first[sym]] for sym in grammar.non_terminals}

def serialize_states(states):
    return [
        {
            'id': i,
            'items': [str(item) for item in state]
        }
        for i, state in enumerate(states)
    ]

def serialize_transitions(transitions):
    return {f"{state},{str(sym)}": target for (state, sym), target in transitions.items()}

def serialize_tables(ACTION, GOTO):
    action_table = {f"{state},{str(term)}": action for (state, term), action in ACTION.items()}
    goto_table = {f"{state},{str(nt)}": next_state for (state, nt), next_state in GOTO.items()}
    return {'ACTION': action_table, 'GOTO': goto_table}

def parse_grammar_from_json(data):
    """Parse grammar definition from JSON data."""
    nts = data['non_terminals']
    ts = data['terminals']
    start = data['start_symbol']
    prods = data['productions']

    non_terminals = {name: NonTerminal(name) for name in nts}
    terminals = {name: Terminal(name) for name in ts}

    productions = []
    for prod_str in prods:
        lhs, rhs = prod_str.split('→')
        lhs = lhs.strip()
        # Split RHS by "|" to handle multiple productions
        rhs_alternatives = [alt.strip() for alt in rhs.strip().split('|')]
        for alt in rhs_alternatives:
            rhs_parts = alt.split()
            rhs_syms = []
            for part in rhs_parts:
                if part in non_terminals:
                    rhs_syms.append(non_terminals[part])
                elif part in terminals:
                    rhs_syms.append(terminals[part])
                else:
                    rhs_syms.append(Terminal(part))
            productions.append(Production(non_terminals[lhs], rhs_syms))

    grammar = Grammar(non_terminals[start], productions)
    dollar = Terminal("$")
    grammar.augment()
    grammar.terminals.add(dollar)
    grammar.compute_first()
    
    return grammar

@app.route('/build_grammar', methods=['POST'])
def build_grammar():
    global current_grammar, current_clr_states, current_clr_transitions, current_lalr_states, current_lalr_transitions, current_ACTION, current_GOTO
    data = request.json
    try:
        logger.info("[LOG build_grammar] ========= Starting grammar build process")
        
        # Parse grammar from JSON
        grammar = parse_grammar_from_json(data)
        logger.info(f"[LOG grammar_parsed] ========= Grammar parsed successfully: {len(grammar.productions)} productions")

        current_grammar = grammar

        # Build CLR
        logger.info("[LOG clr_build] ========= Building CLR(1) states")
        clr_states, clr_transitions = build_CLR_states(grammar)
        clr_ACTION, clr_GOTO = build_parsing_tables(clr_states, clr_transitions, grammar)
        logger.info(f"[LOG clr_complete] ========= CLR(1) build complete: {len(clr_states)} states")

        # Build LALR
        logger.info("[LOG lalr_build] ========= Building LALR(1) states")
        lalr_states, lalr_transitions = build_LALR_states(grammar)
        logger.info(f"[LOG lalr_complete] ========= LALR(1) build complete: {len(lalr_states)} states")

        current_clr_states = clr_states
        current_clr_transitions = clr_transitions
        current_lalr_states = lalr_states
        current_lalr_transitions = lalr_transitions
        current_ACTION = clr_ACTION
        current_GOTO = clr_GOTO

        logger.info("[LOG build_grammar] ========= Grammar build process completed successfully")
        return jsonify({
            'grammar': serialize_grammar(grammar),
            'first_sets': serialize_first_sets(grammar),
            'clr_states': serialize_states(clr_states),
            'clr_transitions': serialize_transitions(clr_transitions),
            'lalr_states': serialize_states(lalr_states),
            'lalr_transitions': serialize_transitions(lalr_transitions),
            'clr_tables': serialize_tables(clr_ACTION, clr_GOTO)
        })
    except KeyError as e:
        logger.error(f"[LOG build_grammar_error] ========= Missing required field: {e}")
        return jsonify({'error': f'Missing required field: {e}'}), 400
    except Exception as e:
        logger.error(f"[LOG build_grammar_error] ========= Error building grammar: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/parse', methods=['POST'])
def parse():
    global current_grammar, current_ACTION, current_GOTO
    if not current_grammar or not current_ACTION or not current_GOTO:
        logger.warning("[LOG parse_error] ========= Parse attempted but grammar not built")
        return jsonify({'error': 'Grammar not built'}), 400

    data = request.json
    input_str = data['input']
    try:
        logger.info(f"[LOG parse_start] ========= Starting parse for input: {input_str}")
        tokens = tokenize(input_str, current_grammar.terminals)
        logger.info(f"[LOG tokenize] ========= Tokenized input: {[str(t) for t in tokens]}")
        
        # Capture print output
        old_stdout = sys.stdout
        sys.stdout = buffer = io.StringIO()
        success = parse_input(tokens, current_ACTION, current_GOTO, current_grammar)
        output = buffer.getvalue()
        sys.stdout = old_stdout

        logger.info(f"[LOG parse_complete] ========= Parse completed: {'success' if success else 'failed'}")
        return jsonify({'success': success, 'steps': output.strip().split('\n')})
    except KeyError as e:
        logger.error(f"[LOG parse_error] ========= Missing required field: {e}")
        return jsonify({'error': f'Missing required field: {e}'}), 400
    except Exception as e:
        logger.error(f"[LOG parse_error] ========= Error parsing input: {e}")
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)