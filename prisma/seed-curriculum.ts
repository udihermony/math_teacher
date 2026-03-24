import { PrismaClient } from "../src/generated/prisma/client.js";
import { Phase } from "../src/generated/prisma/enums.js";

const prisma = new PrismaClient();

interface TopicDef {
  name: string;
  slug: string;
  description: string;
  lessons: { title: string; slug: string; description: string }[];
}

const EXPLORER_TOPICS: TopicDef[] = [
  {
    name: "Fractions & Decimals",
    slug: "explorer-fractions-decimals",
    description: "Understanding, comparing, and computing with fractions and decimals.",
    lessons: [
      { title: "What Are Fractions?", slug: "ex-what-are-fractions", description: "Parts of a whole, numerator and denominator, visual models." },
      { title: "Equivalent Fractions", slug: "ex-equivalent-fractions", description: "Finding equivalent fractions, simplifying to lowest terms." },
      { title: "Comparing & Ordering Fractions", slug: "ex-comparing-fractions", description: "Using common denominators and benchmarks to compare fractions." },
      { title: "Adding & Subtracting Fractions", slug: "ex-add-subtract-fractions", description: "Like and unlike denominators, mixed numbers." },
      { title: "Multiplying & Dividing Fractions", slug: "ex-multiply-divide-fractions", description: "Fraction multiplication, reciprocals, dividing fractions." },
      { title: "Decimals & Place Value", slug: "ex-decimals-place-value", description: "Reading, writing, and comparing decimals to thousandths." },
      { title: "Converting Fractions & Decimals", slug: "ex-converting-frac-dec", description: "Moving between fraction and decimal representations." },
    ],
  },
  {
    name: "Multiplication & Division",
    slug: "explorer-multiplication-division",
    description: "Multi-digit multiplication and division, factors, and multiples.",
    lessons: [
      { title: "Multiplication Facts & Strategies", slug: "ex-mult-facts", description: "Times tables, skip counting, doubling strategies." },
      { title: "Multi-Digit Multiplication", slug: "ex-multi-digit-mult", description: "Area model, partial products, standard algorithm." },
      { title: "Division with Remainders", slug: "ex-division-remainders", description: "Long division, interpreting remainders in context." },
      { title: "Factors & Multiples", slug: "ex-factors-multiples", description: "Finding factors, listing multiples, prime vs composite." },
      { title: "Order of Operations", slug: "ex-order-of-operations", description: "PEMDAS/BODMAS — parentheses, exponents, multiply/divide, add/subtract." },
    ],
  },
  {
    name: "Geometry & Shapes",
    slug: "explorer-geometry-shapes",
    description: "2D and 3D shapes, angles, perimeter, area, and symmetry.",
    lessons: [
      { title: "Types of Angles", slug: "ex-types-of-angles", description: "Acute, right, obtuse, straight, reflex angles; measuring with a protractor." },
      { title: "Triangles & Their Properties", slug: "ex-triangles", description: "Classifying triangles by sides and angles, angle sum property." },
      { title: "Quadrilaterals", slug: "ex-quadrilaterals", description: "Squares, rectangles, parallelograms, trapezoids, rhombuses." },
      { title: "Perimeter & Area", slug: "ex-perimeter-area", description: "Calculating perimeter and area of rectangles, triangles, and compound shapes." },
      { title: "Symmetry & Transformations", slug: "ex-symmetry-transformations", description: "Lines of symmetry, reflection, rotation, translation." },
      { title: "3D Shapes & Nets", slug: "ex-3d-shapes-nets", description: "Cubes, prisms, pyramids, cylinders; nets and surface area." },
    ],
  },
  {
    name: "Measurement & Units",
    slug: "explorer-measurement-units",
    description: "Length, mass, capacity, time, and unit conversions.",
    lessons: [
      { title: "Metric Units of Length", slug: "ex-metric-length", description: "Millimeters, centimeters, meters, kilometers; converting between units." },
      { title: "Mass & Capacity", slug: "ex-mass-capacity", description: "Grams, kilograms, milliliters, liters; estimating and measuring." },
      { title: "Time & Calendars", slug: "ex-time-calendars", description: "Telling time, elapsed time, converting hours/minutes/seconds." },
      { title: "Unit Conversions", slug: "ex-unit-conversions", description: "Converting within metric system, word problems with mixed units." },
    ],
  },
  {
    name: "Data & Graphs",
    slug: "explorer-data-graphs",
    description: "Collecting data, creating graphs, and interpreting results.",
    lessons: [
      { title: "Pictographs & Bar Charts", slug: "ex-pictographs-bar-charts", description: "Reading and creating pictographs and bar charts from data." },
      { title: "Line Graphs", slug: "ex-line-graphs", description: "Plotting points, reading trends, interpreting line graphs." },
      { title: "Mean, Median & Mode", slug: "ex-mean-median-mode", description: "Calculating and comparing measures of central tendency." },
      { title: "Chance & Probability", slug: "ex-chance-probability", description: "Certain, likely, unlikely, impossible; simple probability as a fraction." },
    ],
  },
  {
    name: "Patterns & Algebra",
    slug: "explorer-patterns-algebra",
    description: "Number patterns, simple equations, and algebraic thinking.",
    lessons: [
      { title: "Number Patterns & Sequences", slug: "ex-number-patterns", description: "Identifying, extending, and describing number patterns." },
      { title: "Variables & Expressions", slug: "ex-variables-expressions", description: "Using letters for unknowns, writing and evaluating simple expressions." },
      { title: "Solving Simple Equations", slug: "ex-solving-simple-eq", description: "One-step and two-step equations using inverse operations." },
      { title: "Coordinate Grids", slug: "ex-coordinate-grids", description: "Plotting points in the first quadrant, reading coordinates." },
      { title: "Input-Output Tables", slug: "ex-input-output-tables", description: "Finding rules from tables, completing missing values." },
    ],
  },
];

const BUILDER_TOPICS: TopicDef[] = [
  {
    name: "Integers & Rational Numbers",
    slug: "builder-integers-rational",
    description: "Negative numbers, absolute value, operations with integers and rationals.",
    lessons: [
      { title: "Understanding Negative Numbers", slug: "bu-negative-numbers", description: "Number line, comparing and ordering positive and negative integers." },
      { title: "Adding & Subtracting Integers", slug: "bu-add-subtract-integers", description: "Rules for integer addition and subtraction, real-world contexts." },
      { title: "Multiplying & Dividing Integers", slug: "bu-mult-divide-integers", description: "Sign rules, order of operations with integers." },
      { title: "Operations with Rational Numbers", slug: "bu-rational-operations", description: "Adding, subtracting, multiplying, dividing fractions and mixed numbers." },
    ],
  },
  {
    name: "Ratios, Proportions & Percentages",
    slug: "builder-ratios-proportions",
    description: "Ratios, unit rates, proportional relationships, and percentage applications.",
    lessons: [
      { title: "Ratios & Unit Rates", slug: "bu-ratios-unit-rates", description: "Writing ratios, finding unit rates, comparing quantities." },
      { title: "Proportional Relationships", slug: "bu-proportional-relationships", description: "Identifying proportions, cross-multiplication, scaling." },
      { title: "Percentages", slug: "bu-percentages", description: "Converting between fractions, decimals, and percentages." },
      { title: "Percentage Applications", slug: "bu-percentage-applications", description: "Discounts, tax, tips, percentage increase and decrease." },
      { title: "Direct & Inverse Proportion", slug: "bu-direct-inverse-proportion", description: "Recognizing and solving direct and inverse proportion problems." },
    ],
  },
  {
    name: "Algebraic Expressions & Equations",
    slug: "builder-algebra-expressions",
    description: "Simplifying expressions, solving multi-step equations, and inequalities.",
    lessons: [
      { title: "Simplifying Expressions", slug: "bu-simplifying-expressions", description: "Collecting like terms, distributive property, factoring." },
      { title: "Solving Linear Equations", slug: "bu-solving-linear-eq", description: "Multi-step equations, variables on both sides." },
      { title: "Inequalities", slug: "bu-inequalities", description: "Solving and graphing inequalities on a number line." },
      { title: "Substitution & Formulas", slug: "bu-substitution-formulas", description: "Evaluating expressions and rearranging formulas." },
      { title: "Introduction to Simultaneous Equations", slug: "bu-intro-simultaneous", description: "Solving pairs of equations by elimination and substitution." },
    ],
  },
  {
    name: "Geometry & Measurement",
    slug: "builder-geometry-measurement",
    description: "Angles, circles, area, volume, and Pythagoras' theorem.",
    lessons: [
      { title: "Angle Relationships", slug: "bu-angle-relationships", description: "Complementary, supplementary, vertically opposite, angles in parallel lines." },
      { title: "Area of Complex Shapes", slug: "bu-area-complex-shapes", description: "Trapezoids, parallelograms, circles, composite shapes." },
      { title: "Circles: Circumference & Area", slug: "bu-circles", description: "Pi, circumference formula, area formula, arc length." },
      { title: "Volume & Surface Area", slug: "bu-volume-surface-area", description: "Prisms, cylinders, cones, and spheres." },
      { title: "Pythagoras' Theorem", slug: "bu-pythagoras", description: "Finding missing sides in right triangles, applications." },
      { title: "Introduction to Trigonometry", slug: "bu-intro-trig", description: "SOH-CAH-TOA: sin, cos, tan for right triangles." },
    ],
  },
  {
    name: "Linear Functions & Graphs",
    slug: "builder-linear-functions",
    description: "Plotting linear equations, gradient, y-intercept, and real-world modelling.",
    lessons: [
      { title: "Plotting Linear Graphs", slug: "bu-plotting-linear", description: "Table of values, plotting points, drawing straight lines." },
      { title: "Gradient & y-Intercept", slug: "bu-gradient-intercept", description: "Finding gradient from two points, y = mx + c form." },
      { title: "Equation of a Line", slug: "bu-equation-of-line", description: "Writing equations from graphs, parallel and perpendicular lines." },
      { title: "Real-World Linear Models", slug: "bu-linear-models", description: "Modelling real situations with linear equations, interpreting gradient." },
    ],
  },
  {
    name: "Probability & Statistics",
    slug: "builder-probability-statistics",
    description: "Experimental probability, two-way tables, scatter plots, and averages.",
    lessons: [
      { title: "Experimental vs Theoretical Probability", slug: "bu-exp-vs-theoretical", description: "Running experiments, relative frequency, comparing to theory." },
      { title: "Two-Way Tables & Tree Diagrams", slug: "bu-two-way-tree", description: "Organizing outcomes, calculating combined probabilities." },
      { title: "Scatter Plots & Correlation", slug: "bu-scatter-correlation", description: "Plotting bivariate data, positive/negative/no correlation, line of best fit." },
      { title: "Averages from Grouped Data", slug: "bu-averages-grouped", description: "Estimating mean from frequency tables, cumulative frequency." },
    ],
  },
];

const CHALLENGER_TOPICS: TopicDef[] = [
  {
    name: "Sequences & Series",
    slug: "challenger-sequences-series",
    description: "Arithmetic and geometric sequences, sigma notation, and convergence.",
    lessons: [
      { title: "Arithmetic Sequences", slug: "ch-arithmetic-sequences", description: "Finding terms and sums of arithmetic sequences." },
      { title: "Geometric Sequences", slug: "ch-geometric-sequences", description: "Common ratio, terms, and sums of geometric sequences." },
      { title: "Sigma Notation", slug: "ch-sigma-notation", description: "Expressing and evaluating sums using sigma notation." },
      { title: "Convergent Series", slug: "ch-convergent-series", description: "Infinite geometric series and conditions for convergence." },
    ],
  },
  {
    name: "Exponents & Logarithms",
    slug: "challenger-exponents-logarithms",
    description: "Laws of exponents and logarithms, solving exponential and log equations.",
    lessons: [
      { title: "Exponent Laws", slug: "ch-exponent-laws", description: "Product, quotient, and power rules for exponents." },
      { title: "Solving Exponential Equations", slug: "ch-solving-exponential-eq", description: "Using logs and algebraic techniques to solve exponential equations." },
      { title: "Logarithm Laws", slug: "ch-log-laws", description: "Product, quotient, and change of base rules for logarithms." },
      { title: "Solving Logarithmic Equations", slug: "ch-solving-log-eq", description: "Techniques for solving equations involving logarithms." },
    ],
  },
  {
    name: "Functions & Graphs",
    slug: "challenger-functions-graphs",
    description: "Domain, range, transformations, quadratics, and rational functions.",
    lessons: [
      { title: "Domain, Range & Inverse Functions", slug: "ch-domain-range-inverse", description: "Finding domain, range, composite and inverse functions." },
      { title: "Transformations of Functions", slug: "ch-transformations", description: "Translations, reflections, stretches of function graphs." },
      { title: "Quadratic Functions", slug: "ch-quadratics", description: "Factoring, completing the square, and the discriminant." },
      { title: "Rational Functions & Asymptotes", slug: "ch-rational-functions", description: "Graphing rational functions, vertical and horizontal asymptotes." },
    ],
  },
  {
    name: "Trigonometry Foundations",
    slug: "challenger-trig-foundations",
    description: "Unit circle, trigonometric ratios, identities, and solving trig equations.",
    lessons: [
      { title: "Unit Circle & Trig Ratios", slug: "ch-unit-circle", description: "Sin, cos, tan from the unit circle for all angles." },
      { title: "Trigonometric Identities", slug: "ch-trig-identities", description: "Pythagorean identity and simplifying trig expressions." },
      { title: "Trig Graphs & Transformations", slug: "ch-trig-graphs", description: "Amplitude, period, phase shift of sine and cosine graphs." },
      { title: "Solving Trig Equations", slug: "ch-solving-trig-eq", description: "Finding all solutions in a given interval." },
    ],
  },
  {
    name: "Statistics & Probability",
    slug: "challenger-statistics-probability",
    description: "Descriptive statistics, probability rules, Venn diagrams, and distributions.",
    lessons: [
      { title: "Mean, Standard Deviation & Variance", slug: "ch-mean-sd-variance", description: "Measures of central tendency and spread." },
      { title: "Venn Diagrams & Probability", slug: "ch-venn-probability", description: "Using Venn diagrams to calculate probabilities." },
      { title: "Conditional Probability", slug: "ch-conditional-probability", description: "P(A|B), independent and dependent events." },
      { title: "Intro to Distributions", slug: "ch-intro-distributions", description: "Discrete random variables and probability distributions." },
    ],
  },
  {
    name: "Introduction to Calculus",
    slug: "challenger-intro-calculus",
    description: "Limits, differentiation from first principles, and basic rules.",
    lessons: [
      { title: "Limits & Rates of Change", slug: "ch-limits-rates", description: "Intuitive understanding of limits and average rates of change." },
      { title: "Differentiation from First Principles", slug: "ch-diff-first-principles", description: "The derivative as a limit of the difference quotient." },
      { title: "Basic Differentiation Rules", slug: "ch-basic-diff-rules", description: "Power rule, constant multiple rule, sum/difference rule." },
      { title: "Introduction to Integration", slug: "ch-intro-integration", description: "Antiderivatives and the relationship to area under a curve." },
    ],
  },
];

const IB_READY_TOPICS: TopicDef[] = [
  {
    name: "Number & Algebra",
    slug: "ib-number-algebra",
    description: "IB Topic 1: Sequences, series, exponents, logarithms, binomial theorem, and proof.",
    lessons: [
      { title: "Arithmetic Sequences & Series", slug: "ib-arithmetic-seq-series", description: "nth term, sum formulas, real-world applications of arithmetic sequences." },
      { title: "Geometric Sequences & Series", slug: "ib-geometric-seq-series", description: "Common ratio, sum to n terms, infinite sums, applications." },
      { title: "Sigma Notation", slug: "ib-sigma-notation", description: "Expressing and evaluating series using sigma notation." },
      { title: "Exponent Laws & Solving Equations", slug: "ib-exponent-laws", description: "Laws of exponents and solving exponential equations at IB level." },
      { title: "Log Laws & Solving Equations", slug: "ib-log-laws", description: "Logarithm properties, change of base, solving log equations." },
      { title: "The Binomial Theorem", slug: "ib-binomial-theorem", description: "Binomial expansion, Pascal's triangle, finding specific terms." },
      { title: "Proof by Deduction", slug: "ib-proof-deduction", description: "Logical deductive proofs for mathematical statements." },
    ],
  },
  {
    name: "Functions",
    slug: "ib-functions",
    description: "IB Topic 2: Function properties, transformations, quadratics, and exponential/log functions.",
    lessons: [
      { title: "Domain, Range, Composite & Inverse", slug: "ib-domain-range-composite-inverse", description: "Function notation, composition, finding inverses, restricted domains." },
      { title: "Transformations of Functions", slug: "ib-transformations-functions", description: "Translations, reflections, stretches; combined transformations." },
      { title: "Factorising Quadratic Functions", slug: "ib-factorising-quadratics", description: "Factoring, solving quadratic equations, graphing parabolas." },
      { title: "Completing the Square", slug: "ib-completing-square", description: "Vertex form, turning points, solving by completing the square." },
      { title: "The Discriminant", slug: "ib-discriminant", description: "Nature of roots, discriminant conditions, graphical interpretation." },
      { title: "Rational Functions & Asymptotes", slug: "ib-rational-functions", description: "Graphing rational functions, identifying asymptotes, behavior analysis." },
      { title: "Exponential & Logarithmic Functions", slug: "ib-exp-log-functions", description: "Graphs, properties, solving equations, real-world modelling." },
      { title: "Sketching Functions with a Calculator", slug: "ib-sketching-calculator", description: "Using GDC to sketch, find intersections, and analyze functions." },
    ],
  },
  {
    name: "Geometry & Trigonometry",
    slug: "ib-geometry-trigonometry",
    description: "IB Topic 3: Radians, unit circle, trig identities, sine/cosine rule.",
    lessons: [
      { title: "Radians, Arc Length & Sector Area", slug: "ib-radians-arc-sector", description: "Converting between degrees and radians, arc length and sector area formulas." },
      { title: "Unit Circle & Trigonometric Ratios", slug: "ib-unit-circle-trig", description: "Exact values, reference angles, all four quadrants." },
      { title: "Trig Identities", slug: "ib-trig-identities", description: "Pythagorean identity, double angle formulas, simplifying expressions." },
      { title: "Trig Graphs & Circular Functions", slug: "ib-trig-graphs-circular", description: "Amplitude, period, phase shift; modelling with trig functions." },
      { title: "Solving Trigonometric Equations", slug: "ib-solving-trig-equations", description: "General solutions, solutions in intervals, using identities to solve." },
      { title: "Sine & Cosine Rule, Area of Triangle", slug: "ib-sine-cosine-rule", description: "Non-right triangle problems, ambiguous case, area formula." },
      { title: "Degrees vs Radians", slug: "ib-degrees-radians", description: "When to use each, converting, common mistakes to avoid." },
    ],
  },
  {
    name: "Statistics & Probability",
    slug: "ib-statistics-probability",
    description: "IB Topic 4: Descriptive statistics, probability, and distributions.",
    lessons: [
      { title: "Mean, Standard Deviation & Variance", slug: "ib-mean-sd-variance", description: "Grouped and ungrouped data, GDC calculations, interpretation." },
      { title: "Bivariate Statistics", slug: "ib-bivariate-stats", description: "Scatter plots, line of best fit, correlation coefficient, regression." },
      { title: "Venn Diagrams & Probability", slug: "ib-venn-probability", description: "Union, intersection, complement; calculating probabilities from Venn diagrams." },
      { title: "Conditional Probability", slug: "ib-conditional-probability", description: "P(A|B), tree diagrams, independence, Bayes-style problems." },
      { title: "Probability Distributions", slug: "ib-probability-distributions", description: "Discrete random variables, expected value, variance." },
      { title: "Binomial Distribution", slug: "ib-binomial-distribution", description: "Binomial model, calculating P(X=k), expected value and variance." },
      { title: "Normal Distribution", slug: "ib-normal-distribution", description: "Properties, z-scores, inverse normal, GDC usage." },
    ],
  },
  {
    name: "Calculus",
    slug: "ib-calculus",
    description: "IB Topic 5: Differentiation, integration, tangents, optimization, kinematics.",
    lessons: [
      { title: "Differentiation Rules", slug: "ib-differentiation-rules", description: "Power, chain, product, and quotient rules at IB exam level." },
      { title: "Equation of a Tangent", slug: "ib-tangent-equation", description: "Finding gradient at a point, tangent and normal line equations." },
      { title: "Optimization & Calculus Curves", slug: "ib-optimization-curves", description: "Max/min problems, second derivative test, curve sketching." },
      { title: "Integration Rules", slug: "ib-integration-rules", description: "Power rule for integration, definite integrals, area under curves." },
      { title: "Integration by Substitution", slug: "ib-integration-substitution", description: "u-substitution technique for more complex integrals." },
      { title: "Kinematics", slug: "ib-kinematics", description: "Displacement, velocity, acceleration; calculus applications to motion." },
    ],
  },
];

async function seedPhase(phase: Phase, topicDefs: TopicDef[]) {
  let topicOrder = 1;

  for (const def of topicDefs) {
    // Check if topic already exists
    const existing = await prisma.topic.findUnique({ where: { slug: def.slug } });
    if (existing) {
      console.log(`  ⏭ Topic "${def.name}" already exists, skipping.`);
      continue;
    }

    const topic = await prisma.topic.create({
      data: {
        phase,
        name: def.name,
        slug: def.slug,
        description: def.description,
        order: topicOrder++,
      },
    });

    let lessonOrder = 1;
    for (const lesson of def.lessons) {
      await prisma.lesson.create({
        data: {
          topicId: topic.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          order: lessonOrder++,
          xpReward: 15,
          content: {
            blocks: [
              {
                type: "text",
                content: `# ${lesson.title}\n\n${lesson.description}\n\n*Lesson content will be generated by the AI assistant.*`,
              },
            ],
          },
        },
      });
    }

    console.log(`  ✅ ${def.name} — ${def.lessons.length} lessons`);
  }
}

async function main() {
  console.log("\n📚 Seeding EXPLORER phase (ages 8-11)...");
  await seedPhase(Phase.EXPLORER, EXPLORER_TOPICS);

  console.log("\n📚 Seeding BUILDER phase (ages 11-14)...");
  await seedPhase(Phase.BUILDER, BUILDER_TOPICS);

  console.log("\n📚 Seeding CHALLENGER phase (pre-IB, ages 14-16)...");
  await seedPhase(Phase.CHALLENGER, CHALLENGER_TOPICS);

  console.log("\n📚 Seeding IB_READY phase (IB AA SL, ages 16-18)...");
  await seedPhase(Phase.IB_READY, IB_READY_TOPICS);

  // Count totals
  const phases = [Phase.EXPLORER, Phase.BUILDER, Phase.CHALLENGER, Phase.IB_READY] as const;
  console.log(`\n✅ Curriculum seeded:`);
  for (const phase of phases) {
    const t = await prisma.topic.count({ where: { phase } });
    const l = await prisma.lesson.count({ where: { topic: { phase } } });
    console.log(`   ${phase.padEnd(12)} ${t} topics, ${l} lessons`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
