# Curriculum roadmap

What is written, and what the tracks are planned to cover. Every lesson listed
as *planned* is a filename away from existing — the engine, components, runners
and checker are all in place, so writing one is purely an authoring job.

To add a lesson, drop an `.mdx` file into `content/lessons/<track>/` with
`title`, `module` and a numeric `order` in the frontmatter, then run
`npm run check:content`. It appears in the sidebar, the track page, the
dashboard and the VS Code extension automatically.

Legend: ✅ written · ⬜ planned

---

## C++ (6 of 40 written)

**First steps**
- ✅ 01 Your first program
- ✅ 02 What actually happens when you compile
- ✅ 03 Variables and types
- ⬜ 04 Reading input with `cin`
- ⬜ 05 Operators and precedence

**Control flow**
- ✅ 06 Loops
- ⬜ 07 `if`, `else` and `switch`
- ⬜ 08 Scope and lifetime

**Functions**
- ✅ 09 Functions
- ⬜ 10 References and `const`
- ⬜ 11 Recursion

**Collections**
- ✅ 12 Vectors
- ⬜ 13 Arrays and C-style memory
- ⬜ 14 Strings in depth
- ⬜ 15 `std::map` and `std::set`
- ⬜ 16 Iterators
- ⬜ 17 The algorithms header

**Memory**
- ⬜ 18 Pointers
- ⬜ 19 Dynamic allocation
- ⬜ 20 Smart pointers and RAII
- ⬜ 21 Move semantics

**Types you design**
- ⬜ 22 Structs
- ⬜ 23 Classes and encapsulation
- ⬜ 24 Constructors and destructors
- ⬜ 25 Operator overloading
- ⬜ 26 Inheritance
- ⬜ 27 Virtual functions and polymorphism

**Modern C++**
- ⬜ 28 Templates
- ⬜ 29 Lambdas and closures
- ⬜ 30 `auto`, structured bindings, ranges
- ⬜ 31 Error handling and exceptions
- ⬜ 32 Files and streams
- ⬜ 33 Multiple files, headers and the linker
- ⬜ 34 Compiling and debugging locally
- ⬜ 35–40 Complexity, profiling, and idiomatic patterns

## Arduino (2 of 25 written)

**First sketches**
- ✅ 01 Blink
- ⬜ 02 Digital output and wiring an external LED
- ⬜ 03 Serial as your debugger

**Input**
- ✅ 04 Reading a button
- ⬜ 05 Analogue input: potentiometers and sensors
- ⬜ 06 Debouncing properly

**Timing**
- ⬜ 07 Why `delay()` is a trap
- ⬜ 08 `millis()` and doing two things at once
- ⬜ 09 State machines

**Output**
- ⬜ 10 PWM and fading
- ⬜ 11 Servos
- ⬜ 12 Piezo buzzers and tone
- ⬜ 13 Shift registers
- ⬜ 14 Character LCDs

**Sensors and projects**
- ⬜ 15 Temperature and humidity
- ⬜ 16 Ultrasonic distance
- ⬜ 17 Light sensing
- ⬜ 18–22 Project builds
- ⬜ 23 Interrupts
- ⬜ 24 Power, current limits and what actually kills a board
- ⬜ 25 Moving to PlatformIO

## Python (10 of 35 written)

**First steps**
- ✅ 01 Your first Python program
- ✅ 02 Variables and types
- ✅ 04 Conditions and loops
- ⬜ 07 Strings in depth
- ⬜ 08 Files and error handling

**Collections**
- ✅ 03 Lists
- ✅ 06 Dictionaries and sets
- ⬜ 09 Tuples, comprehensions and generators

**Structure**
- ✅ 05 Functions
- ⬜ 16 Classes and objects
- ⬜ 17 Modules, packages and virtual environments

**Scientific Python**
- ✅ 10 NumPy arrays
- ⬜ 11 Broadcasting and vectorised thinking
- ✅ 12 pandas DataFrames
- ✅ 13 Plotting with Matplotlib
- ⬜ 14 Loading and cleaning real data

**Machine learning**
- ✅ 15 Your first machine learning model
- ⬜ 18 Regression
- ⬜ 19 Feature engineering and pipelines
- ⬜ 20 Cross-validation and hyperparameter search
- ⬜ 21 Classification metrics in depth
- ⬜ 22 Trees, forests and gradient boosting
- ⬜ 23 Clustering and PCA
- ⬜ 24 Overfitting, regularisation and learning curves
- ⬜ 25–35 A full worked project, end to end

## React (2 of 30 written)

**Components**
- ✅ 01 Your first component
- ⬜ 02 Props and composition

**Interactivity**
- ✅ 03 State
- ⬜ 04 Events and forms
- ⬜ 05 Lists and keys
- ⬜ 06 Lifting state up

**Effects and data**
- ⬜ 07 useEffect and synchronisation
- ⬜ 08 Fetching data
- ⬜ 09 Loading and error states

**Structure**
- ⬜ 10 Custom hooks
- ⬜ 11 useReducer
- ⬜ 12 Context
- ⬜ 13 Refs and the DOM
- ⬜ 14 Performance and memoisation
- ⬜ 15–30 Routing, forms at scale, testing, and a full app build

---

## Problem sets (8 written, 80 test cases)

| Tier | Written | Planned |
| --- | --- | --- |
| Warm-up | Twin Totals, Counting Sheep | ~8 |
| Bronze | Stacking Crates, Fence Shadows | ~10 |
| Silver | Water Rationing, Pasture Islands | ~10 |
| Gold | Silo Combinations, Milk Routes | ~8 |

Problems are defined in `scripts/generate-problems.mjs`: a statement, starter
code, hints, a JavaScript reference solution, and a case generator. Running
`npm run problems` writes both the `.mdx` statement and the `.tests.json` data,
so expected outputs are always derived from the reference rather than typed.
