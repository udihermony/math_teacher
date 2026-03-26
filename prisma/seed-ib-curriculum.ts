import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

// ── Types ──────────────────────────────────────────────

interface LessonData {
  title: string;
  slug: string;
  description: string;
  syllabusRef: string;
  estimatedHours: number;
  sourceContent: {
    subtopics: string;
    keyConceptsAndFormulas: string[];
    ibNotes?: string;
  };
}

interface TopicData {
  name: string;
  slug: string;
  description: string;
  ibSection: string;
  lessons: LessonData[];
}

interface PhaseData {
  phase: string;
  estimatedHours: number;
  topics: TopicData[];
}

// ── Curriculum Data ────────────────────────────────────

const IB_CURRICULUM: PhaseData[] = [
  // ─── PHASE 0: Pre-Algebra Foundations (~80 hrs) ───
  {
    phase: "PHASE_0",
    estimatedHours: 80,
    topics: [
      {
        name: "Number Skills",
        slug: "p0-number-skills",
        description: "Core arithmetic fluency with integers, fractions, decimals, and percentages",
        ibSection: "Pre-IB",
        lessons: [
          {
            title: "Integers & Order of Operations",
            slug: "p0-integers-order-of-operations",
            description: "Operations with negatives; BEDMAS/PEMDAS fluency; mental arithmetic drills",
            syllabusRef: "Pre-IB",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Operations with negatives; BEDMAS/PEMDAS fluency; mental arithmetic drills",
              keyConceptsAndFormulas: [
                "Order of operations: Brackets → Exponents → Division/Multiplication → Addition/Subtraction",
                "Integer arithmetic rules: positive × negative = negative, negative × negative = positive",
                "Mental arithmetic strategies for speed and accuracy",
              ],
            },
          },
          {
            title: "Fractions",
            slug: "p0-fractions",
            description: "Simplify, compare, add/subtract/multiply/divide; mixed numbers; word problems",
            syllabusRef: "Pre-IB",
            estimatedHours: 12,
            sourceContent: {
              subtopics: "Simplify, compare, add/subtract/multiply/divide; mixed numbers; word problems",
              keyConceptsAndFormulas: [
                "Simplifying fractions using HCF/GCD",
                "Adding/subtracting fractions: find common denominator",
                "Multiplying fractions: multiply numerators and denominators",
                "Dividing fractions: multiply by reciprocal",
                "Converting between improper fractions and mixed numbers",
              ],
            },
          },
          {
            title: "Decimals & Percentages",
            slug: "p0-decimals-percentages",
            description: "Conversions between fractions, decimals, percentages; percentage increase/decrease; reverse percentages",
            syllabusRef: "Pre-IB",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Conversions between fractions, decimals, percentages; percentage increase/decrease; reverse percentages",
              keyConceptsAndFormulas: [
                "Fraction → Decimal: divide numerator by denominator",
                "Decimal → Percentage: multiply by 100",
                "Percentage increase: New = Original × (1 + r/100)",
                "Percentage decrease: New = Original × (1 − r/100)",
                "Reverse percentage: Original = New / (1 ± r/100)",
              ],
            },
          },
          {
            title: "Ratios & Proportions",
            slug: "p0-ratios-proportions",
            description: "Simplifying ratios; dividing quantities; direct & inverse proportion; unit rates",
            syllabusRef: "Pre-IB",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Simplifying ratios; dividing quantities; direct & inverse proportion; unit rates",
              keyConceptsAndFormulas: [
                "Simplifying ratios by dividing by HCF",
                "Direct proportion: y = kx",
                "Inverse proportion: y = k/x",
                "Unit rate calculations",
              ],
            },
          },
          {
            title: "Powers & Roots",
            slug: "p0-powers-roots",
            description: "Index notation; square/cube roots; laws of indices (integer exponents only)",
            syllabusRef: "Pre-IB",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Index notation; square/cube roots; laws of indices (integer exponents only)",
              keyConceptsAndFormulas: [
                "a^m × a^n = a^(m+n)",
                "a^m ÷ a^n = a^(m−n)",
                "(a^m)^n = a^(mn)",
                "a^0 = 1",
                "√a = a^(1/2), ∛a = a^(1/3)",
              ],
            },
          },
        ],
      },
      {
        name: "Pre-Algebra",
        slug: "p0-pre-algebra",
        description: "Introduction to variables, simple equations, and coordinate geometry",
        ibSection: "Pre-IB",
        lessons: [
          {
            title: "Introduction to Variables",
            slug: "p0-introduction-to-variables",
            description: "Substitution; simplifying expressions; collecting like terms",
            syllabusRef: "Pre-IB",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Substitution; simplifying expressions; collecting like terms",
              keyConceptsAndFormulas: [
                "Variable as a placeholder for an unknown value",
                "Substituting values into algebraic expressions",
                "Collecting like terms: same variable and power",
                "Simplifying by combining coefficients",
              ],
            },
          },
          {
            title: "Simple Equations",
            slug: "p0-simple-equations",
            description: "One-step, two-step, and balancing equations; equations with brackets",
            syllabusRef: "Pre-IB",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "One-step, two-step, and balancing equations; equations with brackets",
              keyConceptsAndFormulas: [
                "Inverse operations to isolate the variable",
                "Balancing principle: same operation on both sides",
                "Expanding brackets before solving",
                "Checking solutions by substitution",
              ],
            },
          },
          {
            title: "Coordinate Plane & Basic Graphs",
            slug: "p0-coordinate-plane-basic-graphs",
            description: "Plotting points; reading coordinates; intro to straight-line graphs",
            syllabusRef: "Pre-IB",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Plotting points; reading coordinates; intro to straight-line graphs",
              keyConceptsAndFormulas: [
                "Coordinate pair (x, y): x is horizontal, y is vertical",
                "Four quadrants of the coordinate plane",
                "Plotting points from a table of values",
                "Recognising simple linear patterns",
              ],
            },
          },
          {
            title: "Multi-step Word Problems",
            slug: "p0-multi-step-word-problems",
            description: "Translating words to arithmetic/algebra; systematic problem-solving strategies",
            syllabusRef: "Pre-IB",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Translating words to arithmetic/algebra; systematic problem-solving strategies",
              keyConceptsAndFormulas: [
                "Identifying key information and unknowns",
                "Translating verbal descriptions into expressions/equations",
                "Multi-step problem-solving strategies",
                "Checking answers for reasonableness",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 1: Core Algebra (~100 hrs) ───
  {
    phase: "PHASE_1",
    estimatedHours: 100,
    topics: [
      {
        name: "Linear Algebra",
        slug: "p1-linear-algebra",
        description: "Linear equations, graphs, simultaneous equations, and inequalities",
        ibSection: "Topic 1–2 (SL)",
        lessons: [
          {
            title: "Linear Equations & Graphs",
            slug: "p1-linear-equations-graphs",
            description: "Multi-step equations; rearranging formulas; gradient and y-intercept; equation of a line; parallel and perpendicular conditions",
            syllabusRef: "SL 2.1",
            estimatedHours: 15,
            sourceContent: {
              subtopics: "Multi-step equations; rearranging formulas; gradient (slope) and y-intercept; equation of a line (gradient-intercept and point-gradient forms); parallel and perpendicular line conditions (m₁ = m₂, m₁·m₂ = −1)",
              keyConceptsAndFormulas: [
                "Gradient-intercept form: y = mx + c",
                "Point-gradient form: y − y₁ = m(x − x₁)",
                "Gradient formula: m = (y₂ − y₁)/(x₂ − x₁)",
                "Parallel lines: m₁ = m₂",
                "Perpendicular lines: m₁ · m₂ = −1",
              ],
            },
          },
          {
            title: "Expanding & Factorising",
            slug: "p1-expanding-factorising",
            description: "Distributive law; double brackets; difference of squares; grouping; simple trinomials",
            syllabusRef: "Pre-IB / SL",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Distributive law; double brackets; difference of squares; grouping; simple trinomials",
              keyConceptsAndFormulas: [
                "Distributive law: a(b + c) = ab + ac",
                "FOIL for double brackets: (a+b)(c+d)",
                "Difference of squares: a² − b² = (a+b)(a−b)",
                "Factorising trinomials: x² + bx + c = (x+p)(x+q) where pq = c, p+q = b",
              ],
            },
          },
          {
            title: "Simultaneous Equations (2×2)",
            slug: "p1-simultaneous-equations",
            description: "Substitution and elimination methods; graphical interpretation",
            syllabusRef: "SL 1.8",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Substitution and elimination methods; graphical interpretation",
              keyConceptsAndFormulas: [
                "Substitution method: solve one equation for a variable, substitute into the other",
                "Elimination method: add/subtract equations to eliminate a variable",
                "Graphical interpretation: intersection point of two lines",
              ],
            },
          },
          {
            title: "Inequalities",
            slug: "p1-inequalities",
            description: "Linear inequalities; quadratic inequalities; sign diagrams; interval notation",
            syllabusRef: "SL 2.5",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Linear inequalities (including on number line); quadratic inequalities (sign diagrams); interval notation",
              keyConceptsAndFormulas: [
                "Reversing inequality sign when multiplying/dividing by negative",
                "Interval notation: (a, b), [a, b], (a, b]",
                "Sign diagram method for quadratic inequalities",
                "Graphical representation on number line",
              ],
            },
          },
        ],
      },
      {
        name: "Quadratics & Functions Intro",
        slug: "p1-quadratics-functions",
        description: "Quadratic equations, graphs, function notation, and transformations",
        ibSection: "Topic 2 (SL)",
        lessons: [
          {
            title: "Quadratic Equations",
            slug: "p1-quadratic-equations",
            description: "Factorisation; completing the square; quadratic formula; the discriminant and nature of roots",
            syllabusRef: "SL 2.5–2.7",
            estimatedHours: 14,
            sourceContent: {
              subtopics: "Factorisation; completing the square; quadratic formula; the discriminant (Δ = b² − 4ac) and nature of roots",
              keyConceptsAndFormulas: [
                "Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a",
                "Discriminant: Δ = b² − 4ac",
                "Δ > 0: two distinct real roots; Δ = 0: one repeated root; Δ < 0: no real roots",
                "Completing the square: ax² + bx + c = a(x − h)² + k",
              ],
            },
          },
          {
            title: "Quadratic Graphs",
            slug: "p1-quadratic-graphs",
            description: "Vertex form; axis of symmetry; y-intercept; sketching from different forms",
            syllabusRef: "SL 2.5",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Vertex form; axis of symmetry; y-intercept; sketching from factored/vertex/standard form",
              keyConceptsAndFormulas: [
                "Vertex form: y = a(x − h)² + k, vertex at (h, k)",
                "Axis of symmetry: x = −b/(2a)",
                "y-intercept: set x = 0",
                "x-intercepts: set y = 0 and solve",
              ],
            },
          },
          {
            title: "Introduction to Functions",
            slug: "p1-introduction-to-functions",
            description: "Function notation f(x); domain and range; evaluating and interpreting functions; vertical line test",
            syllabusRef: "SL 2.2",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Function notation f(x); domain and range; evaluating and interpreting functions; vertical line test",
              keyConceptsAndFormulas: [
                "Function notation: f(x) represents the output for input x",
                "Domain: set of all valid inputs",
                "Range: set of all possible outputs",
                "Vertical line test: each x-value maps to at most one y-value",
              ],
            },
          },
          {
            title: "Function Transformations (Intro)",
            slug: "p1-function-transformations-intro",
            description: "Translations f(x − h) + k; reflections in axes; vertical/horizontal stretches — concepts only",
            syllabusRef: "SL 2.4",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Translations f(x − h) + k; reflections in axes; vertical/horizontal stretches — concepts only, full treatment in Phase 2",
              keyConceptsAndFormulas: [
                "Vertical translation: f(x) + k (up k units)",
                "Horizontal translation: f(x − h) (right h units)",
                "Reflection in x-axis: −f(x)",
                "Reflection in y-axis: f(−x)",
                "Vertical stretch: af(x) (factor a)",
                "Horizontal stretch: f(bx) (factor 1/b)",
              ],
            },
          },
          {
            title: "Scientific Notation & GDC",
            slug: "p1-scientific-notation-gdc",
            description: "Operations with scientific notation; estimation; solving equations graphically with GDC",
            syllabusRef: "SL 1.1 / 2.10",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Operations with a × 10^k; estimation; GDC practice; solving equations graphically; finding intersections; table of values; appropriate window settings",
              keyConceptsAndFormulas: [
                "Scientific notation: a × 10^k where 1 ≤ a < 10",
                "Using GDC to solve equations graphically",
                "Finding intersection points on GDC",
                "Setting appropriate window for graphing",
              ],
            },
          },
          {
            title: "Simple Deductive Proof",
            slug: "p1-simple-deductive-proof",
            description: "Structure of a proof; showing LHS = RHS; the distinction between = and ≡",
            syllabusRef: "SL 1.6",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "Structure of a proof; showing LHS = RHS; the distinction between = and ≡",
              keyConceptsAndFormulas: [
                "Deductive reasoning: premise → conclusion",
                "Showing LHS = RHS by manipulating one side",
                "Identity (≡) vs equation (=)",
                "Clear logical structure in proofs",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 2: Functions & Advanced Algebra (~120 hrs) ───
  {
    phase: "PHASE_2",
    estimatedHours: 120,
    topics: [
      {
        name: "Advanced Functions",
        slug: "p2-advanced-functions",
        description: "Deep dive into function families: composites, inverses, polynomials, rational, and modulus functions",
        ibSection: "Topics 1–2 (SL/AHL)",
        lessons: [
          {
            title: "Function Transformations (Full)",
            slug: "p2-function-transformations-full",
            description: "All combinations: translations, reflections, stretches; sketching transformed graphs",
            syllabusRef: "SL 2.4",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "All combinations: translations, reflections, stretches; sketching transformed graphs; identifying transformations from equations",
              keyConceptsAndFormulas: [
                "Combined transformations applied in correct order",
                "Identifying transformations from equation form",
                "Sketching graphs after multiple transformations",
              ],
            },
          },
          {
            title: "Composite & Inverse Functions",
            slug: "p2-composite-inverse-functions",
            description: "fog and gof; domain restrictions; finding f⁻¹; graphical relationship (reflection in y = x)",
            syllabusRef: "SL 2.2–2.3",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "fog and gof; domain restrictions for composition; finding f⁻¹; domain/range of inverse; graphical relationship (reflection in y = x)",
              keyConceptsAndFormulas: [
                "(f∘g)(x) = f(g(x))",
                "Domain of f∘g: values in domain of g where g(x) is in domain of f",
                "Finding inverse: swap x and y, solve for y",
                "Graph of f⁻¹ is reflection of f in y = x",
              ],
            },
          },
          {
            title: "Polynomial Functions",
            slug: "p2-polynomial-functions",
            description: "Shapes of cubics, quartics; end behaviour; zeros and multiplicity; sketching",
            syllabusRef: "SL / AHL",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Shapes of cubics, quartics; end behaviour; zeros and multiplicity; sketching",
              keyConceptsAndFormulas: [
                "Degree determines end behaviour",
                "Multiplicity of zeros: touches (even) vs crosses (odd) x-axis",
                "Number of turning points ≤ degree − 1",
              ],
            },
          },
          {
            title: "Factor & Remainder Theorems",
            slug: "p2-factor-remainder-theorems",
            description: "Factor theorem; remainder theorem; polynomial division; finding unknown coefficients",
            syllabusRef: "AHL 2.12",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Factor theorem: if f(a) = 0 then (x − a) is a factor; remainder theorem; polynomial division; finding unknown coefficients",
              keyConceptsAndFormulas: [
                "Factor theorem: f(a) = 0 ⟹ (x − a) is a factor of f(x)",
                "Remainder theorem: f(a) = remainder when f(x) ÷ (x − a)",
                "Polynomial long division",
                "Synthetic division",
              ],
            },
          },
          {
            title: "Sum & Product of Roots",
            slug: "p2-sum-product-of-roots",
            description: "Vieta's formulas for quadratics and cubics; forming equations from given roots",
            syllabusRef: "AHL 2.12",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Vieta's formulas for quadratics and cubics; forming equations from given roots",
              keyConceptsAndFormulas: [
                "Quadratic ax² + bx + c: sum of roots = −b/a, product = c/a",
                "Cubic: sum = −b/a, sum of products in pairs = c/a, product = −d/a",
                "Forming equations given roots",
              ],
            },
          },
          {
            title: "Rational Functions",
            slug: "p2-rational-functions",
            description: "Vertical and horizontal asymptotes; holes; sketching; oblique asymptotes",
            syllabusRef: "SL 2.8 / AHL 2.13",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Vertical and horizontal asymptotes; holes; sketching; behaviour near asymptotes; oblique (slant) asymptotes",
              keyConceptsAndFormulas: [
                "Vertical asymptote: denominator = 0 (where not cancelled)",
                "Horizontal asymptote: compare degrees of numerator and denominator",
                "Oblique asymptote: degree of numerator = degree of denominator + 1",
                "Holes: factors that cancel in numerator and denominator",
              ],
            },
          },
          {
            title: "Odd, Even & Self-inverse Functions",
            slug: "p2-odd-even-self-inverse",
            description: "Formal definitions; graphical symmetry; self-inverse functions",
            syllabusRef: "AHL 2.14",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Formal definitions f(−x) = f(x), f(−x) = −f(x); graphical symmetry; self-inverse: f(f(x)) = x",
              keyConceptsAndFormulas: [
                "Even function: f(−x) = f(x), symmetric about y-axis",
                "Odd function: f(−x) = −f(x), rotational symmetry about origin",
                "Self-inverse: f(f(x)) = x, i.e., f = f⁻¹",
              ],
            },
          },
          {
            title: "Modulus Functions & Graphs",
            slug: "p2-modulus-functions",
            description: "Graphs of |f(x)|, f(|x|), 1/f(x); modulus equations and inequalities",
            syllabusRef: "AHL 2.15",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Graphs of y = |f(x)|, y = f(|x|), y = 1/f(x), y = [f(x)]²; modulus equations and inequalities; solving |f(x)| > g(x) analytically and graphically",
              keyConceptsAndFormulas: [
                "|f(x)|: reflect negative parts above x-axis",
                "f(|x|): reflect positive x-part to negative side (symmetric about y-axis)",
                "1/f(x): asymptotes where f(x) = 0, large where f(x) small",
                "Solving |f(x)| = g(x): consider both f(x) = g(x) and f(x) = −g(x)",
              ],
            },
          },
        ],
      },
      {
        name: "Exponentials, Logarithms & Series",
        slug: "p2-exp-log-series",
        description: "Exponential and logarithmic functions, sequences, series, and binomial theorem",
        ibSection: "Topics 1–2 (SL/AHL)",
        lessons: [
          {
            title: "Exponential Functions",
            slug: "p2-exponential-functions",
            description: "Graphs of aˣ; transformations; growth and decay models; solving exponential equations",
            syllabusRef: "SL 2.9",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Graphs of aˣ; transformations; growth and decay models; solving exponential equations",
              keyConceptsAndFormulas: [
                "Exponential growth: y = A·e^(kt), k > 0",
                "Exponential decay: y = A·e^(kt), k < 0",
                "Key feature: y-intercept at (0, 1) for y = aˣ",
                "Horizontal asymptote at y = 0",
              ],
            },
          },
          {
            title: "Logarithms",
            slug: "p2-logarithms",
            description: "Definition; laws of logarithms; solving logarithmic equations; natural logarithm ln",
            syllabusRef: "SL 1.5 / 2.9",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Definition; laws (product, quotient, power, change of base); solving logarithmic equations; natural logarithm ln",
              keyConceptsAndFormulas: [
                "Definition: log_a(b) = c ⟺ a^c = b",
                "Product rule: log(AB) = log A + log B",
                "Quotient rule: log(A/B) = log A − log B",
                "Power rule: log(A^n) = n·log A",
                "Change of base: log_a(b) = log_c(b) / log_c(a)",
                "Natural logarithm: ln x = log_e(x)",
              ],
            },
          },
          {
            title: "Sequences: Arithmetic & Geometric",
            slug: "p2-sequences-arithmetic-geometric",
            description: "nth term; common difference/ratio; financial applications — compound interest, annuities, amortisation",
            syllabusRef: "SL 1.2–1.4",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "nth term; common difference/ratio; applications; financial applications — compound interest, FV = PV(1+r)ⁿ, annuities, amortisation",
              keyConceptsAndFormulas: [
                "Arithmetic: u_n = u₁ + (n−1)d",
                "Geometric: u_n = u₁ · r^(n−1)",
                "Compound interest: FV = PV(1 + r/100)^n",
                "Identifying common difference d or common ratio r",
              ],
            },
          },
          {
            title: "Series & Sigma Notation",
            slug: "p2-series-sigma-notation",
            description: "Finite arithmetic and geometric sums; sigma notation; writing and evaluating sums",
            syllabusRef: "SL 1.2–1.3",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Finite arithmetic and geometric sums; sigma notation; writing and evaluating sums",
              keyConceptsAndFormulas: [
                "Arithmetic series: S_n = n/2 · (2u₁ + (n−1)d) = n/2 · (u₁ + u_n)",
                "Geometric series: S_n = u₁(1 − r^n)/(1 − r)",
                "Sigma notation: Σ from i=1 to n",
              ],
            },
          },
          {
            title: "Infinite Geometric Series",
            slug: "p2-infinite-geometric-series",
            description: "Convergence condition |r| < 1; sum to infinity; applications",
            syllabusRef: "SL 1.8",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Convergence condition |r| < 1; sum to infinity S∞ = a/(1−r); applications",
              keyConceptsAndFormulas: [
                "Convergence condition: |r| < 1",
                "Sum to infinity: S∞ = u₁/(1 − r)",
                "Applications: recurring decimals, bouncing ball problems",
              ],
            },
          },
          {
            title: "Binomial Theorem",
            slug: "p2-binomial-theorem",
            description: "Expansion of (a + b)ⁿ; general term; Pascal's triangle; applications",
            syllabusRef: "SL 1.9",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Expansion of (a + b)ⁿ for n ∈ ℕ; general term using ⁿCᵣ; Pascal's triangle; applications",
              keyConceptsAndFormulas: [
                "General term: T_{r+1} = ⁿCᵣ · a^(n−r) · b^r",
                "ⁿCᵣ = n! / (r!(n−r)!)",
                "Pascal's triangle for coefficients",
              ],
            },
          },
          {
            title: "Counting Principles",
            slug: "p2-counting-principles",
            description: "Permutations and combinations; fundamental counting principle; arrangement problems",
            syllabusRef: "AHL 1.10",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Permutations (ⁿPᵣ) and combinations (ⁿCᵣ); fundamental counting principle; arrangement problems",
              keyConceptsAndFormulas: [
                "Permutation: ⁿPᵣ = n!/(n−r)!",
                "Combination: ⁿCᵣ = n!/(r!(n−r)!)",
                "Fundamental counting principle: multiply choices at each stage",
              ],
            },
          },
          {
            title: "Extended Binomial Theorem",
            slug: "p2-extended-binomial-theorem",
            description: "Expansion for fractional and negative indices; convergence conditions; approximation",
            syllabusRef: "AHL 1.10",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Expansion for fractional and negative indices; convergence conditions; applications to approximation",
              keyConceptsAndFormulas: [
                "(1+x)^n for n ∈ ℚ: infinite series valid for |x| < 1",
                "General term: n(n−1)(n−2)...(n−r+1)/r! · x^r",
                "Approximations using first few terms",
              ],
            },
          },
          {
            title: "Partial Fractions",
            slug: "p2-partial-fractions",
            description: "Decomposition with linear and repeated factors; improper fractions; link to integration",
            syllabusRef: "AHL 1.11",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Decomposition with linear and repeated factors; improper fractions; link to integration (Phase 8)",
              keyConceptsAndFormulas: [
                "Linear factors: A/(x−a) + B/(x−b)",
                "Repeated factors: A/(x−a) + B/(x−a)²",
                "Cover-up method for finding constants",
                "Improper fractions: polynomial division first",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 3: Complex Numbers (~50 hrs) ───
  {
    phase: "PHASE_3",
    estimatedHours: 50,
    topics: [
      {
        name: "Complex Numbers",
        slug: "p3-complex-numbers",
        description: "HL content: complex arithmetic, Argand diagram, polar/Euler forms, De Moivre's theorem, and proofs",
        ibSection: "Topic 1 (AHL)",
        lessons: [
          {
            title: "Cartesian Form",
            slug: "p3-cartesian-form",
            description: "The imaginary unit i; z = a + bi; arithmetic operations; complex conjugate; modulus",
            syllabusRef: "AHL 1.12",
            estimatedHours: 12,
            sourceContent: {
              subtopics: "The imaginary unit i (i² = −1); z = a + bi; arithmetic operations; complex conjugate z*; modulus |z|; solving quadratics with Δ < 0",
              keyConceptsAndFormulas: [
                "i² = −1",
                "z = a + bi, where a = Re(z), b = Im(z)",
                "Complex conjugate: z* = a − bi",
                "Modulus: |z| = √(a² + b²)",
                "z · z* = |z|²",
              ],
            },
          },
          {
            title: "Argand Diagram",
            slug: "p3-argand-diagram",
            description: "Plotting complex numbers; geometric interpretation of operations",
            syllabusRef: "AHL 1.12",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Plotting complex numbers; geometric interpretation of addition, subtraction, conjugation, and modulus",
              keyConceptsAndFormulas: [
                "Real axis (horizontal) and imaginary axis (vertical)",
                "Addition: vector addition (parallelogram law)",
                "Conjugation: reflection in real axis",
                "Modulus: distance from origin",
              ],
            },
          },
          {
            title: "Polar & Euler Forms",
            slug: "p3-polar-euler-forms",
            description: "Modulus-argument form z = r cis θ; Euler form z = re^(iθ); conversions; multiplication and division",
            syllabusRef: "AHL 1.13",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Modulus-argument form z = r cis θ; Euler form z = re^(iθ); conversions between forms; multiplication and division in polar form",
              keyConceptsAndFormulas: [
                "Polar form: z = r(cos θ + i sin θ) = r cis θ",
                "Euler form: z = re^(iθ)",
                "Multiplication: multiply moduli, add arguments",
                "Division: divide moduli, subtract arguments",
                "Conversion: r = |z|, θ = arg(z) = arctan(b/a)",
              ],
            },
          },
          {
            title: "De Moivre's Theorem",
            slug: "p3-de-moivres-theorem",
            description: "Powers of complex numbers; nth roots of complex numbers; applications to trig identities",
            syllabusRef: "AHL 1.14",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Powers of complex numbers; nth roots of complex numbers (roots of unity); applications to trig identities",
              keyConceptsAndFormulas: [
                "De Moivre's theorem: (r cis θ)^n = r^n cis(nθ)",
                "nth roots: z^(1/n) = r^(1/n) cis((θ + 2kπ)/n), k = 0, 1, ..., n−1",
                "Roots of unity: equally spaced on unit circle",
                "Deriving trig identities from De Moivre's theorem",
              ],
            },
          },
          {
            title: "Complex Conjugate Root Theorem",
            slug: "p3-conjugate-root-theorem",
            description: "If coefficients are real and z is a root, so is z*; forming polynomial equations from complex roots",
            syllabusRef: "AHL 1.14",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "If coefficients are real and z is a root, so is z*; forming polynomial equations from complex roots",
              keyConceptsAndFormulas: [
                "Complex roots of real polynomials come in conjugate pairs",
                "Quadratic factor from conjugate pair: (x − z)(x − z*) = x² − 2Re(z)x + |z|²",
                "Forming polynomials from given complex roots",
              ],
            },
          },
          {
            title: "Proof Techniques",
            slug: "p3-proof-techniques",
            description: "Proof by mathematical induction; proof by contradiction; proof by counterexample",
            syllabusRef: "AHL 1.15",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Proof by mathematical induction (divisibility, series, inequalities, De Moivre); proof by contradiction; proof by counterexample",
              keyConceptsAndFormulas: [
                "Induction: base case + inductive step (assume P(k), prove P(k+1))",
                "Contradiction: assume negation, derive logical impossibility",
                "Counterexample: single example disproving a universal statement",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 4: Proof & Systems (~25 hrs) ───
  {
    phase: "PHASE_4",
    estimatedHours: 25,
    topics: [
      {
        name: "Proof & Systems",
        slug: "p4-proof-systems",
        description: "Extended induction practice and 3×3 systems of linear equations",
        ibSection: "Topic 1 (AHL)",
        lessons: [
          {
            title: "Proof by Induction (Extended)",
            slug: "p4-proof-by-induction-extended",
            description: "Dedicated practice: series formulas, matrix powers, divisibility, inequality proofs",
            syllabusRef: "AHL 1.15",
            estimatedHours: 12,
            sourceContent: {
              subtopics: "Dedicated practice: series formulas, matrix powers, divisibility statements, inequality proofs — the most frequently examined AHL proof technique",
              keyConceptsAndFormulas: [
                "Strong induction vs standard induction",
                "Series proofs: assume Σ formula holds for k, prove for k+1",
                "Divisibility proofs: f(k+1) − f(k) analysis",
                "Inequality proofs: careful algebraic manipulation",
              ],
            },
          },
          {
            title: "Systems of Linear Equations (3×3)",
            slug: "p4-systems-3x3",
            description: "Gaussian elimination; classifying solutions; geometric interpretation with planes",
            syllabusRef: "AHL 1.16",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Gaussian elimination (by hand and GDC); classifying solutions as unique, infinitely many, or none; geometric interpretation (planes)",
              keyConceptsAndFormulas: [
                "Row echelon form via Gaussian elimination",
                "Unique solution: three planes intersect at a point",
                "Infinite solutions: planes share a common line",
                "No solution: at least two planes are parallel",
                "Using GDC rref function",
              ],
            },
          },
          {
            title: "Proof Consolidation",
            slug: "p4-proof-consolidation",
            description: "Mixed proof problems combining induction, contradiction, counterexample, and direct proof",
            syllabusRef: "AHL 1.15",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "Mixed proof problems combining induction, contradiction, counterexample, and direct proof across algebra and number theory contexts",
              keyConceptsAndFormulas: [
                "Choosing appropriate proof method for a given statement",
                "Direct proof for universal statements",
                "Contradiction for impossibility/uniqueness",
                "Counterexample for disproving",
                "Induction for sequence/series patterns",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 5: Trigonometry (~100 hrs) ───
  {
    phase: "PHASE_5",
    estimatedHours: 100,
    topics: [
      {
        name: "Core Trigonometry",
        slug: "p5-core-trigonometry",
        description: "Angles, right-triangle trig, unit circle, sine/cosine rules, and applications",
        ibSection: "Topic 3 (SL)",
        lessons: [
          {
            title: "Angles: Degrees and Radians",
            slug: "p5-angles-degrees-radians",
            description: "Converting between degrees and radians; exact radian values; sketching angles",
            syllabusRef: "SL 3.4",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Converting between degrees and radians; exact radian values; sketching angles",
              keyConceptsAndFormulas: [
                "π radians = 180°",
                "Degrees to radians: multiply by π/180",
                "Radians to degrees: multiply by 180/π",
                "Key values: π/6=30°, π/4=45°, π/3=60°, π/2=90°",
              ],
            },
          },
          {
            title: "Right-triangle Trigonometry",
            slug: "p5-right-triangle-trigonometry",
            description: "sin, cos, tan ratios; SOHCAHTOA; solving right triangles",
            syllabusRef: "SL 3.2",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "sin, cos, tan ratios; SOHCAHTOA; solving right triangles; angles of elevation and depression",
              keyConceptsAndFormulas: [
                "sin θ = opposite/hypotenuse",
                "cos θ = adjacent/hypotenuse",
                "tan θ = opposite/adjacent",
              ],
            },
          },
          {
            title: "Unit Circle",
            slug: "p5-unit-circle",
            description: "Defining sin θ and cos θ for all angles; quadrant signs; exact values",
            syllabusRef: "SL 3.5",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Defining sin θ and cos θ for all angles; quadrant signs (ASTC); reference angles; exact values for 0, π/6, π/4, π/3, π/2 and their multiples",
              keyConceptsAndFormulas: [
                "ASTC: All, Sin, Tan, Cos positive in quadrants I, II, III, IV",
                "Reference angle: acute angle to x-axis",
                "Exact values: sin(π/6)=1/2, cos(π/4)=√2/2, tan(π/3)=√3",
              ],
            },
          },
          {
            title: "Sine Rule & Cosine Rule",
            slug: "p5-sine-cosine-rules",
            description: "Sine rule with ambiguous case; cosine rule; area formula A = ½ab sin C",
            syllabusRef: "SL 3.2",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Sine rule (including ambiguous case); cosine rule; choosing the correct rule; area formula A = ½ab sin C",
              keyConceptsAndFormulas: [
                "Sine rule: a/sin A = b/sin B = c/sin C",
                "Cosine rule: c² = a² + b² − 2ab cos C",
                "Area: A = ½ab sin C",
                "Ambiguous case: two possible triangles when using sine rule",
              ],
            },
          },
          {
            title: "Applications of Trigonometry",
            slug: "p5-applications-of-trigonometry",
            description: "Bearings; 3D problems; angles of elevation/depression; word problems",
            syllabusRef: "SL 3.3",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Bearings; 3D problems; angles of elevation/depression; constructing labelled diagrams from word problems",
              keyConceptsAndFormulas: [
                "Bearings: measured clockwise from North",
                "3D trigonometry: find right triangles within 3D shapes",
                "Angle of elevation: upward from horizontal",
                "Angle of depression: downward from horizontal",
              ],
            },
          },
          {
            title: "Arc Length & Sector Area",
            slug: "p5-arc-length-sector-area",
            description: "s = rθ; A = ½r²θ; sectors, segments, and combinations",
            syllabusRef: "SL 3.4",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "s = rθ; A = ½r²θ; problems involving sectors, segments, and combinations",
              keyConceptsAndFormulas: [
                "Arc length: s = rθ (θ in radians)",
                "Sector area: A = ½r²θ",
                "Segment area: A = ½r²(θ − sin θ)",
              ],
            },
          },
          {
            title: "3D Geometry & Mensuration",
            slug: "p5-3d-geometry-mensuration",
            description: "Distance and midpoint in 3D; volume and surface area of 3D solids",
            syllabusRef: "SL 3.1",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Distance and midpoint in 3D; volume and surface area of 3D solids (prisms, pyramids, cones, spheres, hemispheres, composite solids)",
              keyConceptsAndFormulas: [
                "Distance in 3D: √((x₂−x₁)² + (y₂−y₁)² + (z₂−z₁)²)",
                "Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2, (z₁+z₂)/2)",
                "Sphere: V = 4/3πr³, SA = 4πr²",
                "Cone: V = 1/3πr²h, SA = πr² + πrl",
              ],
            },
          },
        ],
      },
      {
        name: "Advanced Trigonometry",
        slug: "p5-advanced-trigonometry",
        description: "Trigonometric graphs, identities, compound angles, and equations",
        ibSection: "Topic 3 (SL/AHL)",
        lessons: [
          {
            title: "Trigonometric Graphs",
            slug: "p5-trigonometric-graphs",
            description: "Graphs of sin, cos, tan; period, amplitude; transformations a sin(b(x − c)) + d",
            syllabusRef: "SL 3.6",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Graphs of sin x, cos x, tan x; period, amplitude; transformations: a sin(b(x − c)) + d; sketching and reading graphs",
              keyConceptsAndFormulas: [
                "Amplitude = |a|",
                "Period = 2π/b",
                "Phase shift = c (right)",
                "Vertical shift = d",
              ],
            },
          },
          {
            title: "Core Identities",
            slug: "p5-core-identities",
            description: "tan θ = sin θ / cos θ; Pythagorean identity; double angle formulas",
            syllabusRef: "SL 3.6",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "tan θ = sin θ / cos θ; sin²θ + cos²θ = 1; double angle formulas: sin 2θ, cos 2θ",
              keyConceptsAndFormulas: [
                "sin²θ + cos²θ = 1",
                "sin 2θ = 2 sin θ cos θ",
                "cos 2θ = cos²θ − sin²θ = 2cos²θ − 1 = 1 − 2sin²θ",
              ],
            },
          },
          {
            title: "Compound Angle Formulas",
            slug: "p5-compound-angle-formulas",
            description: "sin(A ± B), cos(A ± B), tan(A ± B); deriving double angle formulas",
            syllabusRef: "AHL 3.10",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "sin(A ± B), cos(A ± B), tan(A ± B); deriving double angle formulas; applications",
              keyConceptsAndFormulas: [
                "sin(A ± B) = sin A cos B ± cos A sin B",
                "cos(A ± B) = cos A cos B ∓ sin A sin B",
                "tan(A ± B) = (tan A ± tan B)/(1 ∓ tan A tan B)",
              ],
            },
          },
          {
            title: "Reciprocal & Inverse Trig Functions",
            slug: "p5-reciprocal-inverse-trig",
            description: "sec, csc, cot definitions and graphs; identities; arcsin, arccos, arctan",
            syllabusRef: "AHL 3.9",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "sec, csc, cot definitions and graphs; identities: 1 + tan²θ = sec²θ, 1 + cot²θ = csc²θ; arcsin, arccos, arctan — domains, ranges, graphs",
              keyConceptsAndFormulas: [
                "sec θ = 1/cos θ, csc θ = 1/sin θ, cot θ = 1/tan θ",
                "1 + tan²θ = sec²θ",
                "1 + cot²θ = csc²θ",
                "arcsin: domain [−1,1], range [−π/2, π/2]",
                "arccos: domain [−1,1], range [0, π]",
                "arctan: domain ℝ, range (−π/2, π/2)",
              ],
            },
          },
          {
            title: "Symmetry Properties",
            slug: "p5-symmetry-properties",
            description: "sin(π − θ) = sin θ, cos(π − θ) = −cos θ; using symmetry to simplify",
            syllabusRef: "AHL 3.11",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "sin(π − θ) = sin θ, cos(π − θ) = −cos θ, etc.; using symmetry to simplify expressions and solve equations",
              keyConceptsAndFormulas: [
                "sin(π − θ) = sin θ",
                "cos(π − θ) = −cos θ",
                "sin(π + θ) = −sin θ",
                "cos(π + θ) = −cos θ",
              ],
            },
          },
          {
            title: "Trigonometric Equations",
            slug: "p5-trigonometric-equations",
            description: "Solving trig equations in given intervals; using identities; general solutions",
            syllabusRef: "SL / AHL",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Solving trig equations in given intervals; using identities to reduce equations; multiple solutions; general solutions",
              keyConceptsAndFormulas: [
                "General solution for sin x = k: x = arcsin(k) + 2nπ or x = π − arcsin(k) + 2nπ",
                "General solution for cos x = k: x = ±arccos(k) + 2nπ",
                "Using identities to transform equations into solvable form",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 6: Vectors (~80 hrs) ───
  {
    phase: "PHASE_6",
    estimatedHours: 80,
    topics: [
      {
        name: "Vector Operations",
        slug: "p6-vector-operations",
        description: "Fundamentals, dot product, cross product, and vector equations of lines",
        ibSection: "Topic 3 (SL/AHL)",
        lessons: [
          {
            title: "Vector Fundamentals",
            slug: "p6-vector-fundamentals",
            description: "Notation; position vectors; addition, subtraction, scalar multiplication; magnitude; unit vectors",
            syllabusRef: "SL 3.12",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Notation; position vectors; addition, subtraction, scalar multiplication; magnitude; unit vectors; displacement vectors",
              keyConceptsAndFormulas: [
                "Position vector: OA = a",
                "Magnitude: |a| = √(a₁² + a₂² + a₃²)",
                "Unit vector: â = a/|a|",
                "AB = b − a (displacement from A to B)",
              ],
            },
          },
          {
            title: "Scalar (Dot) Product",
            slug: "p6-scalar-dot-product",
            description: "Definition (component and geometric forms); angle between vectors; perpendicularity; projections",
            syllabusRef: "SL 3.13",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Definition (component and geometric forms); angle between two vectors; perpendicularity; projections",
              keyConceptsAndFormulas: [
                "a · b = a₁b₁ + a₂b₂ + a₃b₃",
                "a · b = |a||b| cos θ",
                "Perpendicular ⟺ a · b = 0",
                "Scalar projection of a onto b: (a · b)/|b|",
              ],
            },
          },
          {
            title: "Vector (Cross) Product",
            slug: "p6-vector-cross-product",
            description: "Definition and computation; properties; area of parallelogram and triangle",
            syllabusRef: "AHL 3.16",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Definition and computation; properties; geometric interpretation; area of parallelogram and triangle using cross product",
              keyConceptsAndFormulas: [
                "a × b = |i  j  k; a₁ a₂ a₃; b₁ b₂ b₃|",
                "|a × b| = |a||b| sin θ",
                "a × b ⊥ a and a × b ⊥ b",
                "Area of parallelogram = |a × b|",
                "Area of triangle = ½|a × b|",
              ],
            },
          },
          {
            title: "Vector Equations of Lines",
            slug: "p6-vector-equations-lines",
            description: "Parametric form r = a + λb; Cartesian form; direction vectors; skew lines",
            syllabusRef: "AHL 3.14",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Parametric form r = a + λb; Cartesian form; direction vectors; parallel and intersecting lines; skew lines",
              keyConceptsAndFormulas: [
                "Vector equation: r = a + λb",
                "Parametric form: x = a₁ + λb₁, y = a₂ + λb₂, z = a₃ + λb₃",
                "Cartesian form: (x−a₁)/b₁ = (y−a₂)/b₂ = (z−a₃)/b₃",
                "Parallel lines: direction vectors are scalar multiples",
                "Skew lines: not parallel and do not intersect",
              ],
            },
          },
          {
            title: "Intersections & Angles Between Lines",
            slug: "p6-intersections-angles-lines",
            description: "Finding intersection points; angle between lines; shortest distances",
            syllabusRef: "AHL 3.14–3.15",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Finding intersection points; angle between two lines; shortest distance between point and line; shortest distance between skew lines",
              keyConceptsAndFormulas: [
                "Angle between lines: cos θ = |d₁ · d₂|/(|d₁||d₂|)",
                "Distance from point P to line r = a + λb: |AP × b|/|b|",
                "Shortest distance between skew lines: |AP · (d₁ × d₂)|/|d₁ × d₂|",
              ],
            },
          },
        ],
      },
      {
        name: "Planes",
        slug: "p6-planes",
        description: "Vector equations of planes and intersections involving planes",
        ibSection: "Topic 3 (AHL)",
        lessons: [
          {
            title: "Vector Equations of Planes",
            slug: "p6-vector-equations-planes",
            description: "Parametric form; normal form; Cartesian equation; finding the normal vector",
            syllabusRef: "AHL 3.17",
            estimatedHours: 12,
            sourceContent: {
              subtopics: "Parametric form r = a + λb + μc; normal form r · n = a · n; Cartesian equation ax + by + cz = d; finding the normal vector",
              keyConceptsAndFormulas: [
                "Parametric: r = a + λb + μc",
                "Normal form: r · n = d",
                "Cartesian: ax + by + cz = d where (a,b,c) is normal vector",
                "Normal from two direction vectors: n = b × c",
              ],
            },
          },
          {
            title: "Intersections Involving Planes",
            slug: "p6-intersections-planes",
            description: "Line-plane, two-plane, three-plane intersections; angles between lines and planes",
            syllabusRef: "AHL 3.18",
            estimatedHours: 14,
            sourceContent: {
              subtopics: "Intersection of a line with a plane; intersection of two planes (line of intersection); intersection of three planes (point, line, or no solution); angles between lines and planes; angles between two planes",
              keyConceptsAndFormulas: [
                "Line-plane: substitute parametric equations into plane equation",
                "Two planes: solve system for line of intersection",
                "Angle between line and plane: sin θ = |d · n|/(|d||n|)",
                "Angle between two planes: cos θ = |n₁ · n₂|/(|n₁||n₂|)",
              ],
            },
          },
          {
            title: "Applications & Mixed Vector Problems",
            slug: "p6-applications-mixed-vectors",
            description: "Geometric proofs using vectors; real-world modelling; combined problems",
            syllabusRef: "AHL",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Geometric proofs using vectors; real-world modelling; combined line-plane problems",
              keyConceptsAndFormulas: [
                "Using vectors to prove geometric properties (collinearity, parallelism, perpendicularity)",
                "Position vectors for midpoints, centroids, section formulas",
                "Combined problems requiring multiple vector techniques",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 7: Calculus SL Core (~80 hrs) ───
  {
    phase: "PHASE_7",
    estimatedHours: 80,
    topics: [
      {
        name: "Differentiation",
        slug: "p7-differentiation",
        description: "Limits, derivative rules, and applications of differentiation",
        ibSection: "Topic 5 (SL)",
        lessons: [
          {
            title: "Concept of Limits",
            slug: "p7-concept-of-limits",
            description: "Informal understanding of limits; behaviour near a point; link to gradient of tangent",
            syllabusRef: "SL 5.1",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Informal understanding of limits; behaviour of functions near a point; link to gradient of tangent",
              keyConceptsAndFormulas: [
                "Limit: value a function approaches as input approaches a point",
                "Connection to gradient: gradient of tangent = limit of gradient of secant",
              ],
            },
          },
          {
            title: "Differentiation — Power Rule",
            slug: "p7-differentiation-power-rule",
            description: "Derivative of xⁿ; constant multiples and sums; finding gradients",
            syllabusRef: "SL 5.3",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Derivative of xⁿ; constant multiples and sums; finding gradients; notation dy/dx and f′(x)",
              keyConceptsAndFormulas: [
                "d/dx(xⁿ) = nxⁿ⁻¹",
                "d/dx(cf(x)) = c·f′(x)",
                "d/dx(f(x) + g(x)) = f′(x) + g′(x)",
              ],
            },
          },
          {
            title: "Derivatives of Standard Functions",
            slug: "p7-derivatives-standard-functions",
            description: "Derivatives of sin x, cos x, eˣ, ln x",
            syllabusRef: "SL 5.6",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Derivatives of sin x, cos x, eˣ, ln x — explicit study, not assumed",
              keyConceptsAndFormulas: [
                "d/dx(sin x) = cos x",
                "d/dx(cos x) = −sin x",
                "d/dx(eˣ) = eˣ",
                "d/dx(ln x) = 1/x",
              ],
            },
          },
          {
            title: "Product Rule",
            slug: "p7-product-rule",
            description: "d/dx[uv] = u′v + uv′; practice with mixed function types",
            syllabusRef: "SL 5.6",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "d/dx[uv] = u′v + uv′; practice with mixed function types",
              keyConceptsAndFormulas: [
                "Product rule: d/dx[u·v] = u′v + uv′",
                "Identifying u and v in a product",
              ],
            },
          },
          {
            title: "Quotient Rule",
            slug: "p7-quotient-rule",
            description: "d/dx[u/v] = (u′v − uv′)/v²; applications",
            syllabusRef: "SL 5.6",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "d/dx[u/v] = (u′v − uv′)/v²; applications",
              keyConceptsAndFormulas: [
                "Quotient rule: d/dx[u/v] = (u′v − uv′)/v²",
              ],
            },
          },
          {
            title: "Chain Rule",
            slug: "p7-chain-rule",
            description: "d/dx[f(g(x))] = f′(g(x))·g′(x); composites of all standard functions",
            syllabusRef: "SL 5.6",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "d/dx[f(g(x))] = f′(g(x))·g′(x); composites of all standard functions",
              keyConceptsAndFormulas: [
                "Chain rule: dy/dx = dy/du · du/dx",
                "d/dx[f(g(x))] = f′(g(x)) · g′(x)",
              ],
            },
          },
        ],
      },
      {
        name: "Applications of Calculus",
        slug: "p7-applications-calculus",
        description: "Tangents, turning points, optimisation, kinematics, and basic integration",
        ibSection: "Topic 5 (SL)",
        lessons: [
          {
            title: "Tangents & Normals",
            slug: "p7-tangents-normals",
            description: "Equations of tangent and normal at a point; applications",
            syllabusRef: "SL 5.4",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Equations of tangent and normal at a point; applications",
              keyConceptsAndFormulas: [
                "Tangent at (a, f(a)): y − f(a) = f′(a)(x − a)",
                "Normal: perpendicular to tangent, gradient = −1/f′(a)",
              ],
            },
          },
          {
            title: "Increasing/Decreasing & Turning Points",
            slug: "p7-turning-points",
            description: "First derivative test; second derivative and concavity; relationships between f, f′, f″",
            syllabusRef: "SL 5.7",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "First derivative test; second derivative and concavity; graphical relationships between f, f′, and f″",
              keyConceptsAndFormulas: [
                "f′(x) > 0: increasing; f′(x) < 0: decreasing",
                "Turning point: f′(x) = 0",
                "Second derivative test: f″(x) > 0 minimum, f″(x) < 0 maximum",
                "Concave up: f″(x) > 0; concave down: f″(x) < 0",
              ],
            },
          },
          {
            title: "Points of Inflection",
            slug: "p7-points-of-inflection",
            description: "Definition; finding POIs using f″; distinguishing types",
            syllabusRef: "SL 5.8",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Definition; finding POIs using f″; distinguishing POIs with zero and non-zero gradient",
              keyConceptsAndFormulas: [
                "Point of inflection: f″(x) = 0 AND sign change in f″",
                "Horizontal POI: f′(x) = 0 and f″(x) = 0 with sign change",
              ],
            },
          },
          {
            title: "Optimisation",
            slug: "p7-optimisation",
            description: "Setting up and solving max/min problems; real-world applications",
            syllabusRef: "SL 5.8",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Setting up and solving max/min problems; real-world applications; verifying nature of stationary points",
              keyConceptsAndFormulas: [
                "Steps: form function → differentiate → set f′(x) = 0 → verify nature → interpret",
                "Verifying: second derivative test or sign analysis",
                "Interpreting results in context",
              ],
            },
          },
          {
            title: "Kinematics",
            slug: "p7-kinematics",
            description: "Displacement, velocity, acceleration; differentiation and integration for motion",
            syllabusRef: "SL 5.9",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Displacement, velocity, acceleration; s → v → a by differentiation; total distance vs. displacement",
              keyConceptsAndFormulas: [
                "v = ds/dt (velocity = derivative of displacement)",
                "a = dv/dt = d²s/dt² (acceleration = derivative of velocity)",
                "Total distance = ∫|v| dt",
              ],
            },
          },
          {
            title: "Integration — Basics",
            slug: "p7-integration-basics",
            description: "Antiderivatives; power rule; integrals of standard functions; reverse chain rule",
            syllabusRef: "SL 5.5 / 5.10",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Antiderivatives; power rule for integration; integrals of sin x, cos x, 1/x, eˣ; composites with linear functions (reverse chain rule)",
              keyConceptsAndFormulas: [
                "∫xⁿ dx = x^(n+1)/(n+1) + C (n ≠ −1)",
                "∫sin x dx = −cos x + C",
                "∫cos x dx = sin x + C",
                "∫eˣ dx = eˣ + C",
                "∫1/x dx = ln|x| + C",
              ],
            },
          },
          {
            title: "Definite Integrals & Area",
            slug: "p7-definite-integrals-area",
            description: "Fundamental theorem of calculus; area under curve; area between curves",
            syllabusRef: "SL 5.5 / 5.11",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Fundamental theorem of calculus; area under a curve; area between two curves ∫[f(x) − g(x)] dx; areas involving the x-axis",
              keyConceptsAndFormulas: [
                "∫ₐᵇ f(x) dx = F(b) − F(a)",
                "Area under curve: ∫ₐᵇ f(x) dx (when f(x) ≥ 0)",
                "Area between curves: ∫ₐᵇ |f(x) − g(x)| dx",
                "Split at x-intercepts when curve crosses x-axis",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 8: Calculus HL Extensions (~120 hrs) ───
  {
    phase: "PHASE_8",
    estimatedHours: 120,
    topics: [
      {
        name: "Advanced Differentiation",
        slug: "p8-advanced-differentiation",
        description: "First principles, L'Hôpital's rule, implicit differentiation, related rates, and advanced derivatives",
        ibSection: "Topic 5 (AHL)",
        lessons: [
          {
            title: "Differentiation from First Principles",
            slug: "p8-differentiation-first-principles",
            description: "Formal definition using limits; continuity and differentiability; higher derivatives",
            syllabusRef: "AHL 5.12",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Formal definition f′(x) = lim(h→0) [f(x+h) − f(x)] / h; continuity and differentiability; higher derivatives (f″, f‴, …)",
              keyConceptsAndFormulas: [
                "f′(x) = lim(h→0) [f(x+h) − f(x)] / h",
                "Differentiable ⟹ continuous (converse not always true)",
                "Higher derivatives: f″(x) = d²y/dx²",
              ],
            },
          },
          {
            title: "L'Hôpital's Rule",
            slug: "p8-lhopitals-rule",
            description: "Evaluating limits of indeterminate forms 0/0 and ∞/∞; repeated application",
            syllabusRef: "AHL 5.13",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Evaluating limits of indeterminate forms 0/0 and ∞/∞; repeated application; applications",
              keyConceptsAndFormulas: [
                "If lim f(x)/g(x) is 0/0 or ∞/∞, then lim f(x)/g(x) = lim f′(x)/g′(x)",
                "May need repeated application",
                "Must verify indeterminate form before applying",
              ],
            },
          },
          {
            title: "Implicit Differentiation",
            slug: "p8-implicit-differentiation",
            description: "Differentiating implicitly; finding dy/dx for implicit curves; tangent lines",
            syllabusRef: "AHL 5.14",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Differentiating implicitly; finding dy/dx for curves not written as y = f(x); tangent lines to implicit curves",
              keyConceptsAndFormulas: [
                "Differentiate both sides with respect to x",
                "d/dx(y²) = 2y · dy/dx (chain rule)",
                "Collect dy/dx terms and solve",
              ],
            },
          },
          {
            title: "Related Rates",
            slug: "p8-related-rates",
            description: "Setting up and solving related-rate problems using chain rule",
            syllabusRef: "AHL 5.14",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Setting up and solving related-rate problems using implicit differentiation and chain rule",
              keyConceptsAndFormulas: [
                "Chain rule with time: dV/dt = dV/dr · dr/dt",
                "Steps: identify variables → write equation → differentiate with respect to t → substitute",
              ],
            },
          },
          {
            title: "Derivatives of Advanced Functions",
            slug: "p8-derivatives-advanced-functions",
            description: "Derivatives of tan x, sec x, csc x, cot x, aˣ, logₐ x, arcsin x, arccos x, arctan x",
            syllabusRef: "AHL 5.15",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Derivatives of tan x, sec x, csc x, cot x, aˣ, logₐ x, arcsin x, arccos x, arctan x",
              keyConceptsAndFormulas: [
                "d/dx(tan x) = sec²x",
                "d/dx(aˣ) = aˣ ln a",
                "d/dx(logₐ x) = 1/(x ln a)",
                "d/dx(arcsin x) = 1/√(1−x²)",
                "d/dx(arccos x) = −1/√(1−x²)",
                "d/dx(arctan x) = 1/(1+x²)",
              ],
            },
          },
        ],
      },
      {
        name: "Integration Techniques",
        slug: "p8-integration-techniques",
        description: "Substitution, partial fractions, inverse trig integrals, integration by parts, and volumes of revolution",
        ibSection: "Topic 5 (AHL)",
        lessons: [
          {
            title: "Integration by Substitution",
            slug: "p8-integration-by-substitution",
            description: "u-substitution for indefinite and definite integrals; choosing substitutions",
            syllabusRef: "AHL 5.15",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "u-substitution for indefinite and definite integrals; choosing appropriate substitutions; reverse chain rule",
              keyConceptsAndFormulas: [
                "Let u = g(x), then du = g′(x) dx",
                "∫f(g(x))g′(x)dx = ∫f(u)du",
                "For definite integrals: change limits when substituting",
              ],
            },
          },
          {
            title: "Integration Using Partial Fractions",
            slug: "p8-integration-partial-fractions",
            description: "Integrating rational functions after partial fraction decomposition",
            syllabusRef: "AHL 5.15",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Integrating rational functions after partial fraction decomposition (links to Phase 2)",
              keyConceptsAndFormulas: [
                "∫A/(x−a) dx = A ln|x−a| + C",
                "Decompose first, then integrate each term",
              ],
            },
          },
          {
            title: "Standard Integrals (Inverse Trig)",
            slug: "p8-standard-integrals-inverse-trig",
            description: "∫1/(a²+x²) dx and ∫1/√(a²−x²) dx; recognition and application",
            syllabusRef: "AHL 5.15",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "∫ 1/(a² + x²) dx = (1/a) arctan(x/a) + C; ∫ 1/√(a² − x²) dx = arcsin(x/a) + C; recognition and application",
              keyConceptsAndFormulas: [
                "∫ 1/(a² + x²) dx = (1/a) arctan(x/a) + C",
                "∫ 1/√(a² − x²) dx = arcsin(x/a) + C",
              ],
            },
          },
          {
            title: "Integration by Parts",
            slug: "p8-integration-by-parts",
            description: "∫u dv = uv − ∫v du; repeated integration by parts; LIATE guideline",
            syllabusRef: "AHL 5.16",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "∫ u dv = uv − ∫ v du; repeated integration by parts; LIATE guideline; tabular method",
              keyConceptsAndFormulas: [
                "∫u dv = uv − ∫v du",
                "LIATE priority: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential",
                "Tabular method for repeated application",
              ],
            },
          },
          {
            title: "Volumes of Revolution",
            slug: "p8-volumes-of-revolution",
            description: "Rotation about x-axis and y-axis; volumes using integration",
            syllabusRef: "AHL 5.17",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Rotation about x-axis: V = π∫ y² dx; rotation about y-axis: V = π∫ x² dy; areas between curve and y-axis",
              keyConceptsAndFormulas: [
                "About x-axis: V = π∫ₐᵇ [f(x)]² dx",
                "About y-axis: V = π∫ₐᵇ [g(y)]² dy",
              ],
            },
          },
        ],
      },
      {
        name: "Differential Equations & Series",
        slug: "p8-diff-eqs-series",
        description: "Separable, homogeneous, and linear first-order DEs; Euler's method; Maclaurin series",
        ibSection: "Topic 5 (AHL)",
        lessons: [
          {
            title: "Differential Equations — Separable",
            slug: "p8-separable-des",
            description: "Separating variables; solving; initial conditions; modelling growth, decay, cooling",
            syllabusRef: "AHL 5.18",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Separating variables; solving and sketching solution curves; initial conditions; modelling (growth, decay, cooling)",
              keyConceptsAndFormulas: [
                "Separate: g(y) dy = f(x) dx",
                "Integrate both sides",
                "Apply initial conditions to find C",
              ],
            },
          },
          {
            title: "Euler's Method",
            slug: "p8-eulers-method",
            description: "Numerical solution of DEs; step-by-step calculation; accuracy and limitations",
            syllabusRef: "AHL 5.18",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Numerical solution of DEs; step-by-step calculation; accuracy and limitations",
              keyConceptsAndFormulas: [
                "x_{n+1} = x_n + h",
                "y_{n+1} = y_n + h·f(x_n, y_n)",
                "Smaller h → better accuracy but more steps",
              ],
            },
          },
          {
            title: "Homogeneous DEs",
            slug: "p8-homogeneous-des",
            description: "Substitution y = vx; reducing to separable form; solving and back-substituting",
            syllabusRef: "AHL 5.18",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Substitution y = vx; reducing to separable form; solving and back-substituting",
              keyConceptsAndFormulas: [
                "Homogeneous: dy/dx = f(y/x)",
                "Substitution: y = vx, so dy/dx = v + x·dv/dx",
                "Reduces to separable DE in v and x",
              ],
            },
          },
          {
            title: "First-order Linear DEs (Integrating Factor)",
            slug: "p8-linear-des-integrating-factor",
            description: "Standard form dy/dx + P(x)y = Q(x); finding integrating factor; solving",
            syllabusRef: "AHL 5.18",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Standard form dy/dx + P(x)y = Q(x); finding integrating factor e^(∫P dx); solving",
              keyConceptsAndFormulas: [
                "Integrating factor: μ(x) = e^(∫P(x) dx)",
                "Multiply through: d/dx[μy] = μQ",
                "Integrate: μy = ∫μQ dx",
              ],
            },
          },
          {
            title: "Maclaurin Series",
            slug: "p8-maclaurin-series",
            description: "General formula; standard expansions; obtaining series by substitution, products, differentiation; applications",
            syllabusRef: "AHL 5.19",
            estimatedHours: 12,
            sourceContent: {
              subtopics: "General formula; standard expansions: eˣ, sin x, cos x, ln(1+x), (1+x)ᵖ, arctan x; obtaining series by substitution, products, differentiation, integration; using DEs to find series; applications and approximation",
              keyConceptsAndFormulas: [
                "f(x) = Σ f⁽ⁿ⁾(0)/n! · xⁿ",
                "eˣ = 1 + x + x²/2! + x³/3! + ...",
                "sin x = x − x³/3! + x⁵/5! − ...",
                "cos x = 1 − x²/2! + x⁴/4! − ...",
                "ln(1+x) = x − x²/2 + x³/3 − ... (|x| ≤ 1)",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 9: Statistics & Probability (~80 hrs) ───
  {
    phase: "PHASE_9",
    estimatedHours: 80,
    topics: [
      {
        name: "Statistics",
        slug: "p9-statistics",
        description: "Data collection, presentation, descriptive statistics, and regression",
        ibSection: "Topic 4 (SL)",
        lessons: [
          {
            title: "Sampling & Data Collection",
            slug: "p9-sampling-data-collection",
            description: "Population vs sample; sampling methods; reliability; bias",
            syllabusRef: "SL 4.1",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Population vs sample; simple random, convenience, systematic, quota, stratified sampling; reliability of data; bias",
              keyConceptsAndFormulas: [
                "Population: entire group of interest",
                "Sample: subset of population",
                "Random sampling: each member has equal chance of selection",
                "Stratified: proportional representation from subgroups",
              ],
            },
          },
          {
            title: "Data Presentation",
            slug: "p9-data-presentation",
            description: "Histograms; cumulative frequency; box-and-whisker diagrams; interpretation",
            syllabusRef: "SL 4.2",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Histograms; cumulative frequency graphs and curves; box-and-whisker diagrams; interpreting graphical displays",
              keyConceptsAndFormulas: [
                "Histogram: frequency density = frequency / class width",
                "Cumulative frequency curve: S-shaped curve",
                "Box plot: minimum, Q1, median, Q3, maximum",
              ],
            },
          },
          {
            title: "Descriptive Statistics",
            slug: "p9-descriptive-statistics",
            description: "Mean, median, mode, range; quartiles and IQR; variance and standard deviation",
            syllabusRef: "SL 4.3",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Mean, median, mode, range; quartiles (Q1, Q3) and IQR; variance and standard deviation (by hand and GDC)",
              keyConceptsAndFormulas: [
                "Mean: x̄ = Σx/n",
                "Variance: σ² = Σ(x − x̄)²/n",
                "Standard deviation: σ = √variance",
                "IQR = Q3 − Q1",
              ],
            },
          },
          {
            title: "Correlation & Regression",
            slug: "p9-correlation-regression",
            description: "Scatter diagrams; Pearson's r; regression lines; interpolation vs extrapolation",
            syllabusRef: "SL 4.4 / 4.10",
            estimatedHours: 10,
            sourceContent: {
              subtopics: "Scatter diagrams; Pearson's product-moment correlation coefficient r; regression line of y on x and x on y; interpreting gradient, intercept, and r; interpolation vs extrapolation",
              keyConceptsAndFormulas: [
                "Pearson's r: measures linear correlation (−1 ≤ r ≤ 1)",
                "r close to ±1: strong linear relationship",
                "Regression line: ŷ = a + bx (minimises sum of squared residuals)",
                "Interpolation: within data range; extrapolation: outside (less reliable)",
              ],
            },
          },
        ],
      },
      {
        name: "Probability",
        slug: "p9-probability",
        description: "Probability fundamentals, distributions, and advanced topics",
        ibSection: "Topic 4 (SL/AHL)",
        lessons: [
          {
            title: "Probability Fundamentals",
            slug: "p9-probability-fundamentals",
            description: "Sample space; combined and mutually exclusive events; Venn diagrams; tree diagrams",
            syllabusRef: "SL 4.5–4.6",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Sample space; combined and mutually exclusive events; Venn diagrams, tree diagrams, sample space diagrams; complementary events",
              keyConceptsAndFormulas: [
                "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)",
                "Mutually exclusive: P(A ∩ B) = 0",
                "Complement: P(A′) = 1 − P(A)",
              ],
            },
          },
          {
            title: "Conditional Probability",
            slug: "p9-conditional-probability",
            description: "P(A|B); independent events; tree diagrams and tables for conditional problems",
            syllabusRef: "SL 4.6",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "P(A|B) = P(A∩B)/P(B); independent events; using tree diagrams and tables for conditional problems",
              keyConceptsAndFormulas: [
                "P(A|B) = P(A ∩ B) / P(B)",
                "Independent events: P(A ∩ B) = P(A) · P(B)",
                "Independent ⟺ P(A|B) = P(A)",
              ],
            },
          },
          {
            title: "Discrete Random Variables",
            slug: "p9-discrete-random-variables",
            description: "Probability distributions; expected value E(X); applications",
            syllabusRef: "SL 4.7",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Probability distributions; expected value E(X) = Σx·P(X=x); applications",
              keyConceptsAndFormulas: [
                "Σ P(X=x) = 1 for all x",
                "E(X) = Σ x · P(X=x)",
                "Var(X) = E(X²) − [E(X)]²",
              ],
            },
          },
          {
            title: "Binomial Distribution",
            slug: "p9-binomial-distribution",
            description: "Conditions; X ~ B(n, p); mean np and variance npq; GDC use",
            syllabusRef: "SL 4.8",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Conditions; X ~ B(n, p); calculating P(X = k); mean np and variance npq; GDC use",
              keyConceptsAndFormulas: [
                "P(X = k) = ⁿCₖ · pᵏ · (1−p)^(n−k)",
                "E(X) = np",
                "Var(X) = np(1−p)",
                "Conditions: fixed n, independent trials, constant p, two outcomes",
              ],
            },
          },
          {
            title: "Normal Distribution",
            slug: "p9-normal-distribution",
            description: "X ~ N(μ, σ²); standard normal Z; z-scores; inverse normal calculations",
            syllabusRef: "SL 4.9 / 4.12",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "X ~ N(μ, σ²); standard normal Z; z-score formula z = (x − μ)/σ; finding probabilities; inverse normal calculations (finding μ or σ)",
              keyConceptsAndFormulas: [
                "z = (x − μ) / σ",
                "68-95-99.7 rule for 1, 2, 3 standard deviations",
                "Standardising: convert X ~ N(μ, σ²) to Z ~ N(0, 1)",
                "Inverse normal: given probability, find x",
              ],
            },
          },
          {
            title: "Bayes' Theorem",
            slug: "p9-bayes-theorem",
            description: "Two-event and three-event forms; tree diagram approach; applications",
            syllabusRef: "AHL 4.13",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Two-event and three-event forms; tree diagram approach; applications to medical testing, quality control, etc.",
              keyConceptsAndFormulas: [
                "P(A|B) = P(B|A) · P(A) / P(B)",
                "P(B) = Σ P(B|Aᵢ) · P(Aᵢ) (law of total probability)",
              ],
            },
          },
          {
            title: "Continuous Random Variables",
            slug: "p9-continuous-random-variables",
            description: "PDFs; finding mode, median, mean via integration; variance; E(aX+b) and Var(aX+b)",
            syllabusRef: "AHL 4.14",
            estimatedHours: 8,
            sourceContent: {
              subtopics: "Probability density functions (pdf); finding mode, median, mean via integration; variance of continuous distributions; E(aX + b) and Var(aX + b) rules",
              keyConceptsAndFormulas: [
                "∫ f(x) dx = 1 (total area under pdf)",
                "E(X) = ∫ x·f(x) dx",
                "Var(X) = ∫ x²·f(x) dx − [E(X)]²",
                "E(aX + b) = aE(X) + b",
                "Var(aX + b) = a²Var(X)",
              ],
            },
          },
        ],
      },
    ],
  },

  // ─── PHASE 10: Review & Exam Prep (~100 hrs) ───
  {
    phase: "PHASE_10",
    estimatedHours: 100,
    topics: [
      {
        name: "Exam Preparation",
        slug: "p10-exam-preparation",
        description: "Mixed practice, past papers, exam technique, and formula booklet mastery",
        ibSection: "All",
        lessons: [
          {
            title: "Mixed Topic Problem Sets",
            slug: "p10-mixed-topic-problems",
            description: "Cross-topic problems combining 2–3 syllabus areas; identifying methods; timed sets",
            syllabusRef: "All",
            estimatedHours: 20,
            sourceContent: {
              subtopics: "Cross-topic problems combining 2–3 syllabus areas; identifying which tools/methods to apply; timed sets",
              keyConceptsAndFormulas: [
                "Connecting concepts across topics",
                "Method selection under time pressure",
                "Building fluency with topic transitions",
              ],
            },
          },
          {
            title: "Weak Area Identification & Targeted Revision",
            slug: "p10-weak-area-revision",
            description: "Self-assessment against syllabus checklist; focused revision on weakest topics",
            syllabusRef: "All",
            estimatedHours: 15,
            sourceContent: {
              subtopics: "Self-assessment against syllabus checklist; focused revision on weakest 3–4 topics; re-doing misunderstood exam questions",
              keyConceptsAndFormulas: [
                "Syllabus checklist for self-assessment",
                "Targeted practice on weak areas",
                "Spaced repetition for retention",
              ],
            },
          },
          {
            title: "Paper 1 Practice (No GDC)",
            slug: "p10-paper-1-practice",
            description: "Full past papers; algebraic manipulation, exact values, proof, manual computation",
            syllabusRef: "All",
            estimatedHours: 20,
            sourceContent: {
              subtopics: "Full past papers under timed conditions; focus on algebraic manipulation, exact values, proof, and manual computation",
              keyConceptsAndFormulas: [
                "Paper 1: no calculator, 30% of grade, 2 hours",
                "Focus: algebraic skills, exact values, proof techniques",
                "Time management: ~2 minutes per mark",
              ],
            },
          },
          {
            title: "Paper 2 Practice (GDC)",
            slug: "p10-paper-2-practice",
            description: "Full past papers; GDC fluency; interpreting technology output",
            syllabusRef: "All",
            estimatedHours: 15,
            sourceContent: {
              subtopics: "Full past papers under timed conditions; GDC fluency (graphing, intersections, statistics, normal distribution); interpreting technology output",
              keyConceptsAndFormulas: [
                "Paper 2: calculator allowed, 30% of grade, 2 hours",
                "GDC skills: graphing, intersections, statistics functions",
                "Writing solutions: show method even when using GDC",
              ],
            },
          },
          {
            title: "Paper 3 Practice (HL Investigation)",
            slug: "p10-paper-3-practice",
            description: "Past Paper 3s; generalisation, conjecture, proof; extended problem-solving",
            syllabusRef: "AHL",
            estimatedHours: 20,
            sourceContent: {
              subtopics: "Past Paper 3s and specimen papers; developing skills in generalisation, conjecture, proof, and structured mathematical investigation; extended problem-solving under time pressure",
              keyConceptsAndFormulas: [
                "Paper 3: HL only, 1 hour, 20% of grade",
                "Skills: pattern recognition, conjecture, proof, generalisation",
                "Structure: guided investigation building to HL-level proof",
              ],
            },
          },
          {
            title: "Error Tracking & Exam Technique",
            slug: "p10-error-tracking-exam-technique",
            description: "Logging recurring errors; understanding mark schemes; improving exam technique",
            syllabusRef: "All",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "Logging recurring errors; understanding mark schemes and how method marks (M), accuracy marks (A), and reasoning marks (R) are awarded; improving exam technique",
              keyConceptsAndFormulas: [
                "M marks: method marks (correct approach even with arithmetic error)",
                "A marks: accuracy marks (correct final answer)",
                "R marks: reasoning marks (justification required)",
                "Follow-through marks: subsequent marks using wrong earlier answer",
              ],
            },
          },
          {
            title: "Formula Booklet Mastery",
            slug: "p10-formula-booklet-mastery",
            description: "Complete familiarity with IB formula booklet; what is and isn't provided",
            syllabusRef: "All",
            estimatedHours: 5,
            sourceContent: {
              subtopics: "Complete familiarity with every formula in the IB formula booklet; knowing what is and is not provided; speed of reference",
              keyConceptsAndFormulas: [
                "Know what's in the booklet: don't memorise what's provided",
                "Know what's NOT in the booklet: memorise these",
                "Practice finding formulas quickly during timed conditions",
              ],
            },
          },
        ],
      },
      {
        name: "Internal Assessment",
        slug: "p10-internal-assessment",
        description: "IA (Mathematical Exploration) — worth 20% of final grade",
        ibSection: "IA",
        lessons: [
          {
            title: "Topic Selection & Research Question",
            slug: "p10-ia-topic-selection",
            description: "Choosing a topic; formulating a focused research question; initial research",
            syllabusRef: "IA",
            estimatedHours: 6,
            sourceContent: {
              subtopics: "Choosing a topic that genuinely interests you and allows HL-level mathematics; formulating a focused research question; initial background research",
              keyConceptsAndFormulas: [
                "Topic should allow HL-level mathematics (Criterion E)",
                "Research question should be specific and focused",
                "Personal engagement is key (Criterion C)",
              ],
            },
          },
          {
            title: "Planning & Data Collection",
            slug: "p10-ia-planning-data",
            description: "Deciding on methodology; collecting data; identifying mathematical tools",
            syllabusRef: "IA",
            estimatedHours: 4,
            sourceContent: {
              subtopics: "Deciding on methodology; collecting or generating data; identifying which mathematical tools will be used",
              keyConceptsAndFormulas: [
                "Data can be primary (collected) or secondary (from sources)",
                "Plan which mathematical techniques will be applied",
                "Consider multiple approaches/representations",
              ],
            },
          },
          {
            title: "Mathematical Exploration & Development",
            slug: "p10-ia-mathematical-exploration",
            description: "Applying mathematics; multiple representations; extending and generalising",
            syllabusRef: "IA",
            estimatedHours: 14,
            sourceContent: {
              subtopics: "Applying mathematics to the research question; using multiple representations; extending and generalising; ensuring sufficient sophistication for HL (Criterion E)",
              keyConceptsAndFormulas: [
                "Criterion E: Use of Mathematics — must be commensurate with HL level",
                "Multiple representations: algebraic, graphical, numerical",
                "Extension: go beyond initial exploration",
              ],
            },
          },
          {
            title: "Draft Writing & Final Write-up",
            slug: "p10-ia-draft-writing",
            description: "Introduction, structure, communication, personal engagement; revision and formatting",
            syllabusRef: "IA",
            estimatedHours: 16,
            sourceContent: {
              subtopics: "Introduction, rationale, and structure; clear communication (Criterion B); personal engagement (Criterion C); coherent mathematical presentation (Criterion D); proofreading; feedback integration; 12–20 page length; citations",
              keyConceptsAndFormulas: [
                "Criterion A: Presentation (structure, formatting)",
                "Criterion B: Mathematical communication (notation, terminology)",
                "Criterion C: Personal engagement (creativity, independent thinking)",
                "Criterion D: Reflection (critical analysis of results)",
                "Criterion E: Use of Mathematics (HL-level sophistication)",
                "Length: 12–20 pages recommended",
              ],
            },
          },
        ],
      },
    ],
  },
];

// ── Seed Function ──────────────────────────────────────

async function seedIBCurriculum() {
  console.log("🌱 Seeding IB Math AA HL curriculum...\n");

  // Delete existing curriculum data (in order due to foreign keys)
  console.log("Clearing existing curriculum data...");
  await prisma.explanation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.challengeSubmission.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.classAssignment.deleteMany();
  await prisma.problemSkill.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.topic.deleteMany();

  let totalTopics = 0;
  let totalLessons = 0;

  for (const phaseData of IB_CURRICULUM) {
    console.log(`\n📚 Phase: ${phaseData.phase} (${phaseData.estimatedHours}h)`);

    let topicOrder = 0;
    for (const topicData of phaseData.topics) {
      topicOrder++;
      const topic = await prisma.topic.create({
        data: {
          phase: phaseData.phase as "PHASE_0" | "PHASE_1" | "PHASE_2" | "PHASE_3" | "PHASE_4" | "PHASE_5" | "PHASE_6" | "PHASE_7" | "PHASE_8" | "PHASE_9" | "PHASE_10",
          name: topicData.name,
          slug: topicData.slug,
          description: topicData.description,
          order: topicOrder,
          ibSection: topicData.ibSection,
          estimatedHours: topicData.lessons.reduce((sum, l) => sum + l.estimatedHours, 0),
        },
      });
      totalTopics++;
      console.log(`  📁 Topic: ${topicData.name}`);

      let lessonOrder = 0;
      for (const lessonData of topicData.lessons) {
        lessonOrder++;
        await prisma.lesson.create({
          data: {
            topicId: topic.id,
            title: lessonData.title,
            slug: lessonData.slug,
            description: lessonData.description,
            content: {
              sections: [
                {
                  title: "Overview",
                  body: lessonData.description,
                },
                {
                  title: "Key Concepts",
                  body: lessonData.sourceContent.keyConceptsAndFormulas.join("\n"),
                },
              ],
            },
            order: lessonOrder,
            xpReward: Math.round(10 + lessonData.estimatedHours * 2),
            sourceContent: JSON.parse(JSON.stringify(lessonData.sourceContent)),
            syllabusRef: lessonData.syllabusRef,
            estimatedHours: lessonData.estimatedHours,
          },
        });
        totalLessons++;
      }
    }
  }

  console.log(`\n✅ Seeded ${totalTopics} topics and ${totalLessons} lessons across ${IB_CURRICULUM.length} phases`);
}

seedIBCurriculum()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
