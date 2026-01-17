# core/grammar.py

class Symbol:
    def __init__(self, name: str):
        self.name = name

    def __str__(self):
        return self.name

    def __repr__(self):
        return self.name

    def __eq__(self, other):
        return isinstance(other, Symbol) and self.name == other.name

    def __hash__(self):
        return hash(self.name)


class Terminal(Symbol):
    pass


class NonTerminal(Symbol):
    pass


class Production:
    def __init__(self, left: NonTerminal, right: list[Symbol]):
        self.left = left
        self.right = right

    def __str__(self):
        rhs = " ".join(str(sym) for sym in self.right)
        return f"{self.left} → {rhs}"

    def __repr__(self):
        return str(self)


class Grammar:
    def __init__(self, start_symbol: NonTerminal, productions: list[Production]):
        self.start_symbol = start_symbol
        self.productions = productions

        self.non_terminals = set()
        self.terminals = set()

        self._collect_symbols()

    def _collect_symbols(self):
        for prod in self.productions:
            self.non_terminals.add(prod.left)
            for sym in prod.right:
                if isinstance(sym, NonTerminal):
                    self.non_terminals.add(sym)
                elif isinstance(sym, Terminal):
                    self.terminals.add(sym)
    def augment(self):
            new_start = NonTerminal(f"{self.start_symbol.name}'")
            new_production = Production(new_start, [self.start_symbol])
            self.productions.insert(0, new_production)

            self.start_symbol = new_start
            self.non_terminals.add(new_start)
    def compute_first(self):
        # Initialize FIRST sets
        self.first = {symbol: set() for symbol in self.non_terminals.union(self.terminals)}

        # FIRST of terminals is the terminal itself
        for t in self.terminals:
            self.first[t].add(t)

        # Repeat until no changes
        changed = True
        while changed:
            changed = False
            for prod in self.productions:
                left = prod.left
                right = prod.right

                # Track if ε can be derived
                can_derive_epsilon = True

                for sym in right:
                    # Add FIRST(sym) \ {ε} to FIRST(left)
                    before = len(self.first[left])
                    self.first[left].update(self.first[sym] - set(['ε']))
                    after = len(self.first[left])
                    if after > before:
                        changed = True

                    # Stop if sym does NOT derive ε
                    if 'ε' not in self.first[sym]:
                        can_derive_epsilon = False
                        break

                # If all symbols can derive ε, add ε to FIRST(left)
                if can_derive_epsilon:
                    if 'ε' not in self.first[left]:
                        self.first[left].add('ε')
                        changed = True

    def print_first(self):
        print("\nFIRST sets:")
        for sym in self.non_terminals:
            first_set = ", ".join(str(t) for t in self.first[sym])
            print(f"FIRST({sym}) = {{ {first_set} }}")


    def print(self):
        print(f"Start symbol: {self.start_symbol}\n")
        print("Productions:")
        for prod in self.productions:
            print(f"  {prod}")
