# core/item.py

from core.grammar import Production, Terminal, NonTerminal

class Item:
    def __init__(self, production: Production, dot: int = 0, lookahead: Terminal = None):
        self.production = production
        self.dot = dot
        self.lookahead = lookahead  # LR(1) lookahead symbol

    def next_symbol(self):
        """Return the symbol after the dot, or None if dot is at end"""
        if self.dot < len(self.production.right):
            return self.production.right[self.dot]
        return None

    def advance_dot(self):
        """Return a new Item with the dot advanced by one"""
        return Item(self.production, self.dot + 1, self.lookahead)

    def is_complete(self):
        """Check if dot has reached the end"""
        return self.dot >= len(self.production.right)

    def __eq__(self, other):
        return (self.production == other.production and
                self.dot == other.dot and
                self.lookahead == other.lookahead)

    def __hash__(self):
        return hash((self.production, self.dot, self.lookahead))

    def __str__(self):
        right = self.production.right.copy()
        right.insert(self.dot, '•')
        rhs = " ".join(str(s) for s in right)
        if self.lookahead:
            return f"[{self.production.left} → {rhs}, {self.lookahead}]"
        return f"[{self.production.left} → {rhs}]"

    def __repr__(self):
        return str(self)
