/**
 * Math expression equivalence checker.
 *
 * Normalizes mathematical expressions to a canonical form and compares them.
 * Handles: basic arithmetic, commutativity, sign normalization, whitespace,
 * simple algebraic expressions.
 *
 * For advanced symbolic equivalence (e.g. factored vs expanded forms),
 * the AI companion's analysis will supplement this.
 */

// ── Tokenizer ──────────────────────────────────────────

type TokenType = "number" | "variable" | "operator" | "lparen" | "rparen";

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.replace(/\s+/g, "");

  while (i < s.length) {
    const ch = s[i];

    if (/[0-9.]/.test(ch)) {
      let num = "";
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i++];
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      tokens.push({ type: "variable", value: ch });
      i++;
      continue;
    }

    if ("+-*/^".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i++;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(" });
      i++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")" });
      i++;
      continue;
    }

    // Skip unknown characters
    i++;
  }

  return tokens;
}

// ── Term representation ────────────────────────────────

interface Term {
  coefficient: number;
  variables: string; // sorted variable string, e.g. "xy"
}

/**
 * Parse a simple polynomial expression into a list of terms.
 * Handles: 2x + 3, 4 + 2x, -x + 5, 3xy, etc.
 * Does NOT handle: nested parens, division, exponents (those need AI).
 */
function parseTerms(tokens: Token[]): Term[] {
  const terms: Term[] = [];
  let sign = 1;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // Handle sign operators
    if (token.type === "operator") {
      if (token.value === "+") {
        sign = 1;
      } else if (token.value === "-") {
        sign = -1;
      }
      i++;
      continue;
    }

    // Parse a term: optional number followed by optional variables
    let coefficient = sign;
    let variables = "";

    if (token.type === "number") {
      coefficient = sign * parseFloat(token.value);
      i++;
    }

    // Collect variables (implicit multiplication)
    while (i < tokens.length && tokens[i].type === "variable") {
      variables += tokens[i].value;
      i++;
    }

    // If we only had a number with no variables, or variables with implicit coeff
    if (variables === "" && token.type === "number") {
      // constant term
    } else if (token.type === "variable" && coefficient === sign) {
      // Variable with no explicit coefficient: coefficient is the sign
    }

    // Sort variables alphabetically for canonical form
    variables = variables.split("").sort().join("");

    terms.push({ coefficient, variables });

    // Reset sign for next term
    sign = 1;
  }

  return terms;
}

/**
 * Combine like terms and sort for canonical comparison.
 */
function normalizeTerms(terms: Term[]): Term[] {
  const combined = new Map<string, number>();

  for (const term of terms) {
    const key = term.variables;
    combined.set(key, (combined.get(key) || 0) + term.coefficient);
  }

  // Filter out zero terms, sort by variable string for stable comparison
  return Array.from(combined.entries())
    .filter(([, coeff]) => Math.abs(coeff) > 1e-10)
    .map(([variables, coefficient]) => ({ coefficient, variables }))
    .sort((a, b) => {
      // Variables first (by name), then constants
      if (a.variables && !b.variables) return -1;
      if (!a.variables && b.variables) return 1;
      return a.variables.localeCompare(b.variables);
    });
}

/**
 * Convert terms to a canonical string representation.
 */
function termsToString(terms: Term[]): string {
  if (terms.length === 0) return "0";

  return terms
    .map((t) => {
      const coeff =
        t.variables === ""
          ? String(t.coefficient)
          : t.coefficient === 1
          ? ""
          : t.coefficient === -1
          ? "-"
          : String(t.coefficient);
      return coeff + t.variables;
    })
    .join("|");
}

// ── Public API ─────────────────────────────────────────

/**
 * Normalize a math expression to a canonical form.
 * Used for comparing student answers with correct answers.
 */
export function normalize(expr: string): string {
  const cleaned = expr.trim();

  // If it's purely numeric, normalize the number
  const num = parseFloat(cleaned);
  if (!isNaN(num) && String(num) === cleaned.replace(/\s/g, "")) {
    // Normalize number precision
    return String(Math.round(num * 1e10) / 1e10);
  }

  // Try to parse as polynomial terms
  const tokens = tokenize(cleaned);
  const terms = parseTerms(tokens);
  const normalized = normalizeTerms(terms);
  return termsToString(normalized);
}

/**
 * Check if two mathematical expressions are equivalent.
 *
 * Examples:
 *   areEquivalent("2x + 4", "4 + 2x") → true
 *   areEquivalent("3", "3.0") → true
 *   areEquivalent("x + x", "2x") → true
 *   areEquivalent("-x + 5", "5 - x") → true
 */
export function areEquivalent(a: string, b: string): boolean {
  // Quick exact match (case-insensitive, whitespace-normalized)
  const cleanA = a.trim().toLowerCase().replace(/\s+/g, "");
  const cleanB = b.trim().toLowerCase().replace(/\s+/g, "");
  if (cleanA === cleanB) return true;

  // Normalize and compare
  return normalize(a) === normalize(b);
}

/**
 * Validate a student's free-input answer against the correct answer.
 * Returns true if the answers are mathematically equivalent.
 */
export function validateAnswer(
  studentAnswer: string,
  correctAnswer: string
): boolean {
  if (!studentAnswer.trim()) return false;
  return areEquivalent(studentAnswer, correctAnswer);
}
