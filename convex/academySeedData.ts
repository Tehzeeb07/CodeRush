/**
 * CodeRush - Code Academy starter curriculum (seed data).
 *
 * Pure data + builders; consumed by the admin-only `seedAcademyContent`
 * mutation in academyAdmin.ts. Only plain JSON-able values are used so every
 * shape matches the academy* table validators.
 */

export type SeedDifficulty = "beginner" | "intermediate" | "advanced";

/** Content block shapes — must match the `academyLessons.content` validator. */
export type SeedContentBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language: string; code: string; caption?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "link"; text: string; url: string }
  | { type: "note"; text: string }
  | { type: "warning"; text: string }
  | { type: "tip"; text: string };

/** Code example shape — must match the `academyLessons.codeExamples` validator. */
export interface SeedCodeExample {
  title?: string;
  language: string;
  code: string;
  expectedOutput?: string;
  explanation?: string;
}

export interface SeedExercise {
  title: string;
  difficulty: SeedDifficulty;
  question: string;
  instructions: string[];
  starterCode: string;
  language: string;
  expectedOutput?: string;
  hints?: string[];
}

export interface SeedLessonSeed {
  lesson: {
    slug: string;
    title: string;
    shortDescription: string;
    difficulty: SeedDifficulty;
    estimatedMinutes: number;
    content: SeedContentBlock[];
    codeExamples: SeedCodeExample[];
  };
  exercise?: SeedExercise;
  quiz?: SeedQuiz;
}

export interface SeedModuleSeed {
  title: string;
  description?: string;
  lessons: SeedLessonSeed[];
}

export interface SeedCourseSeed {
  course: {
    title: string;
    slug: string;
    description: string;
    difficulty: SeedDifficulty;
    durationMinutes?: number;
    xpReward: number;
  };
  modules: SeedModuleSeed[];
}

export interface SeedTechSeed {
  technology: {
    name: string;
    slug: string;
    description: string;
    icon?: string;
    color?: string;
    sortOrder: number;
  };
  courses: SeedCourseSeed[];
}

/* ---------------- content block builders ---------------- */

const h = (level: 1 | 2 | 3, text: string): SeedContentBlock => ({ type: "heading", level, text });
const p = (text: string): SeedContentBlock => ({ type: "paragraph", text });
const list = (items: string[], ordered = false): SeedContentBlock => ({ type: "list", ordered, items });
const codeBlock = (language: string, code: string, caption?: string): SeedContentBlock =>
  ({ type: "code", language, code, caption });
const tip = (text: string): SeedContentBlock => ({ type: "tip", text });
const warn = (text: string): SeedContentBlock => ({ type: "warning", text });
const note = (text: string): SeedContentBlock => ({ type: "note", text });

interface LessonOpts {
  slug: string;
  title: string;
  shortDescription: string;
  body: string;
  minutes?: number;
  difficulty?: SeedDifficulty;
  code?: { language: string; code: string; caption?: string; expectedOutput?: string; explanation?: string; runnable?: boolean };
  points?: string[];
  note?: string;
  tip?: string;
  warn?: string;
  exercise?: SeedExercise;
  quiz?: SeedQuiz;
}

function L(o: LessonOpts): SeedLessonSeed {
  const content: SeedContentBlock[] = [p(o.shortDescription), p(o.body)];
  if (o.code) {
    content.push(codeBlock(o.code.language, o.code.code, o.code.caption ?? "Example"));
  }
  if (o.points && o.points.length > 0) {
    content.push(h(2, "Key takeaways"), list(o.points));
  }
  if (o.note) content.push(note(o.note));
  if (o.tip) content.push(tip(o.tip));
  if (o.warn) content.push(warn(o.warn));

  const codeExamples: SeedCodeExample[] = [];
  if (o.code && o.code.runnable) {
    codeExamples.push({
      title: o.title,
      language: o.code.language,
      code: o.code.code,
      expectedOutput: o.code.expectedOutput,
      explanation: o.code.explanation,
    });
  }

  return {
    lesson: {
      slug: o.slug,
      title: o.title,
      shortDescription: o.shortDescription,
      difficulty: o.difficulty ?? "beginner",
      estimatedMinutes: o.minutes ?? 8,
      content,
      codeExamples,
    },
    ...(o.exercise ? { exercise: o.exercise } : {}),
    ...(o.quiz ? { quiz: o.quiz } : {}),
  };
}

export interface SeedQuiz {
  title: string;
  passingPercentage: number;
  allowRetake: boolean;
  questions: Array<{
    question: string;
    options: Array<{ id: string; text: string }>;
    correctAnswerId: string;
    explanation?: string;
  }>;
}

function quiz(title: string, questions: SeedQuiz["questions"]): SeedQuiz {
  return { title, passingPercentage: 70, allowRetake: true, questions };
}

function cppLessonCode(code: string, expectedOutput: string) {
  return { language: "cpp", code, expectedOutput, runnable: true };
}
/* ================================================================
   C++ FUNDAMENTALS
   ================================================================ */

const cppCourse: SeedCourseSeed = {
  course: {
    title: "C++ Fundamentals",
    slug: "cpp-fundamentals",
    description:
      "Learn C++ from absolute zero: setup, variables, operators, conditions, loops, functions, arrays, strings, pointers, OOP and the Standard Template Library.",
    difficulty: "beginner",
    durationMinutes: 300,
    xpReward: 100,
  },
  modules: [
    {
      title: "Module 1: Introduction",
      description: "What C++ is, how to set it up, and your first program.",
      lessons: [
        L({
          slug: "what-is-cpp",
          title: "What is C++?",
          shortDescription: "Meet C++: a fast, powerful, compiled language used everywhere from games to operating systems.",
          body: "C++ is a compiled, general-purpose programming language created by Bjarne Stroustrup as an extension of C. It gives you fine control over memory and hardware while still offering high-level features such as classes and templates. C++ powers game engines, browsers, operating systems and high-frequency trading systems.",
          points: [
            "C++ is compiled: your source code is translated into fast machine code.",
            "It supports both procedural and object-oriented programming.",
            "It is used for performance-critical software such as games and engines.",
          ],
          tip: "You do not need to memorize everything in this course. Focus on understanding the concepts; syntax becomes natural with practice.",
        }),
        L({
          slug: "setting-up-cpp",
          title: "Setting Up C++",
          shortDescription: "Install a compiler and an editor so you can build and run C++ programs.",
          body: "To compile C++ you need a compiler such as GCC (g++), Clang or MSVC, plus a code editor like VS Code. On CodeRush you can also write and run C++ directly in the browser using the built-in sandbox, so you can start learning before installing anything.",
          points: [
            "Common compilers: g++ (GCC), Clang and MSVC.",
            "VS Code with the C/C++ extension is a popular free setup.",
            "CodeRush lets you run C++ in the sandbox without any local install.",
          ],
          note: "Every runnable example in this course can be executed right here on CodeRush with the Run Code button.",
        }),
        L({
          slug: "first-cpp-program",
          title: "First C++ Program",
          shortDescription: "Write, understand and run your very first C++ program.",
          body: "The program below prints a line of text to the console. The #include line brings in the input/output library, using namespace std lets you write cout instead of std::cout, and main() is the entry point where every C++ program starts.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    cout << "Hello, CodeRush!" << endl;
    return 0;
}`,
            "Hello, CodeRush!"
          ),
          points: [
            "#include <iostream> gives you access to cout and cin.",
            "main() is where execution starts; it must return an int.",
            "return 0; tells the operating system the program finished successfully.",
          ],
        }),
      ],
    },
    {
      title: "Module 2: Variables & Data Types",
      lessons: [
        L({
          slug: "variables",
          title: "Variables",
          shortDescription: "Store and label data with variables.",
          body: "A variable is a named piece of memory that stores a value. You declare a variable by writing its type, then its name, then optionally an initial value. Once declared, you can read and update the value through its name.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int score = 100;
    score = score + 50;
    cout << "Score: " << score << endl;
    return 0;
}`,
            "Score: 150"
          ),
          points: [
            "Declaration: type name = value; (the = part is optional at declaration).",
            "Variable names are case-sensitive and cannot start with a digit.",
            "Use descriptive names: playerScore beats s.",
          ],
          exercise: {
            title: "Store and print your details",
            difficulty: "beginner",
            question: "Create a C++ program that stores a name and an age in variables and prints both values.",
            instructions: [
              "Declare a string variable called name with your name.",
              "Declare an int variable called age with your age.",
              "Print both values using cout.",
            ],
            starterCode: `#include <iostream>
#include <string>
using namespace std;

int main() {
    // TODO: declare name and age here

    return 0;
}`,
            language: "cpp",
            expectedOutput: "Name: Alex\nAge: 21",
            hints: ["Use string for text (include <string>) and int for whole numbers.", "Print with cout: cout << \"Name: \" << name << endl;"],
          },
        }),
        L({
          slug: "data-types",
          title: "Data Types",
          shortDescription: "int, double, char, bool and string - the building blocks of data.",
          body: "Every variable in C++ has a type that decides what values it can hold and how much memory it uses. The most common built-in types are int for whole numbers, double for decimals, char for single characters, bool for true/false values, and std::string for text.",
          code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

int main() {
    int age = 21;
    double price = 9.99;
    char grade = 'A';
    bool isActive = true;
    string name = "CodeRush";

    cout << age << " " << price << " " << grade << " "
         << isActive << " " << name << endl;
    return 0;
}`,
            "21 9.99 A 1 CodeRush"
          ),
          points: [
            "int holds whole numbers; double holds floating-point numbers.",
            "char holds one character in single quotes; bool holds true or false.",
            "std::string (include <string>) holds text in double quotes.",
          ],
          warn: "bool prints as 1 or 0 by default. Use cout << boolalpha to print true and false.",
        }),
        L({
          slug: "constants",
          title: "Constants",
          shortDescription: "Protect values that must never change with const.",
          body: "Sometimes a value should never change while the program runs, like the number of days in a week. Mark such variables with the const keyword. The compiler will then refuse any attempt to modify them, catching bugs before they happen.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    const int DAYS_IN_WEEK = 7;
    const double PI = 3.14159;

    cout << "Days: " << DAYS_IN_WEEK << endl;
    cout << "Pi: " << PI << endl;
    // DAYS_IN_WEEK = 8; // ERROR: cannot modify a const
    return 0;
}`,
            "Days: 7\nPi: 3.14159"
          ),
          points: [
            "const variables must be initialized when declared.",
            "Attempting to change a const value is a compile-time error.",
            "Constant names are usually written in UPPER_SNAKE_CASE.",
          ],
        }),
      ],
    },
    {
      title: "Module 3: Operators",
      lessons: [
        L({
          slug: "arithmetic-operators",
          title: "Arithmetic Operators",
          shortDescription: "Add, subtract, multiply, divide and find remainders.",
          body: "C++ provides the classic math operators: + - * / and % (remainder). Integer division truncates the decimal part, and % only works with integers, giving the remainder of a division.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int a = 17, b = 5;
    cout << a + b << endl; // 22
    cout << a - b << endl; // 12
    cout << a * b << endl; // 85
    cout << a / b << endl; // 3 (integer division)
    cout << a % b << endl; // 2 (remainder)
    return 0;
}`,
            "22\n12\n85\n3\n2"
          ),
          points: [
            "17 / 5 is 3 for ints, but 17.0 / 5 is 3.4 for doubles.",
            "% returns the remainder and works only on integer types.",
            "Check divisibility with x % y == 0.",
          ],
        }),
        L({
          slug: "comparison-logical-operators",
          title: "Comparison & Logical Operators",
          shortDescription: "Ask true/false questions: ==, !=, <, >, &&, || and !.",
          body: "Comparison operators compare two values and produce a bool. Logical operators combine bools: && is true only if both sides are true, || is true if at least one side is true, and ! flips a bool.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int age = 20;
    bool hasTicket = true;

    cout << (age >= 18) << endl;          // 1
    cout << (age >= 18 && hasTicket) << endl; // 1
    cout << (age < 18 || hasTicket) << endl;  // 1
    cout << !hasTicket << endl;           // 0
    return 0;
}`,
            "1\n1\n1\n0"
          ),
          points: [
            "== compares values; = assigns. Mixing them up is a classic bug.",
            "&& needs both sides true; || needs at least one true.",
            "! reverses a condition.",
          ],
        }),
        L({
          slug: "assignment-operators",
          title: "Assignment Operators",
          shortDescription: "Shortcuts like +=, -=, *= and the increment operators ++ and --.",
          body: "Compound assignment operators update a variable in place: x += 5 is shorthand for x = x + 5. The ++ and -- operators increase or decrease a value by one, which is especially common inside loops.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int x = 10;
    x += 5;  // 15
    x -= 3;  // 12
    x *= 2;  // 24
    x /= 4;  // 6
    x++;     // 7
    cout << x << endl;
    return 0;
}`,
            "7"
          ),
          points: [
            "x += n means x = x + n; the same pattern works for -, *, / and %.",
            "++x increments before use; x++ increments after use.",
          ],
        }),
      ],
    },
    {
      title: "Module 4: Conditions",
      lessons: [
        L({
          slug: "if-else",
          title: "if / else",
          shortDescription: "Make decisions in code with if, else if and else.",
          body: "The if statement runs a block of code only when a condition is true. else if lets you test more conditions in order, and else runs when none of the previous conditions matched.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int score = 72;

    if (score >= 90) {
        cout << "Excellent" << endl;
    } else if (score >= 60) {
        cout << "Pass" << endl;
    } else {
        cout << "Try again" << endl;
    }
    return 0;
}`,
            "Pass"
          ),
          points: [
            "Conditions are evaluated from top to bottom; the first true branch wins.",
            "Always use braces {} even for single statements to avoid subtle bugs.",
          ],
        }),
        L({
          slug: "switch",
          title: "switch",
          shortDescription: "Cleanly branch on one value with many possible cases.",
          body: "A switch statement compares one expression against constant case labels and jumps to the matching one. Each case usually ends with break to stop fall-through, and default handles unmatched values.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int day = 3;
    switch (day) {
        case 1: cout << "Mon"; break;
        case 2: cout << "Tue"; break;
        case 3: cout << "Wed"; break;
        default: cout << "Other";
    }
    cout << endl;
    return 0;
}`,
            "Wed"
          ),
          points: [
            "switch works on integral types and chars, not strings.",
            "Forgetting break makes execution fall through to the next case.",
          ],
        }),
        L({
          slug: "ternary-operator",
          title: "Ternary Operator",
          shortDescription: "A compact one-line if/else for choosing between two values.",
          body: "The ternary operator condition ? a : b evaluates to a when the condition is true and to b otherwise. It is perfect for small choices, especially when assigning a value.",
          code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int age = 20;
    string status = (age >= 18) ? "adult" : "minor";
    cout << status << endl;
    return 0;
}`,
            "adult"
          ),
          points: [
            "Use it for short assignments, not for complex logic.",
            "Both result expressions must have compatible types.",
          ],
        }),
      ],
    },
  ],
};

/* -------- C++ modules 5-8 -------- */

const cppModules58 = [
  {
    title: "Module 5: Loops",
    lessons: [
      L({
        slug: "while-loop",
        title: "while Loop",
        shortDescription: "Repeat a block while a condition stays true.",
        body: "The while loop checks its condition before each iteration. As long as the condition is true, the body runs again. Make sure something inside the body moves the loop toward finishing, or it will run forever.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int i = 1;
    while (i <= 5) {
        cout << i << " ";
        i++;
    }
    cout << endl;
    return 0;
}`,
          "1 2 3 4 5"
        ),
        points: [
          "The condition is tested before every iteration.",
          "Forget to update the counter and you get an infinite loop.",
        ],
      }),
      L({
        slug: "for-loop",
        title: "for Loop",
        shortDescription: "The classic counting loop: init; condition; update.",
        body: "A for loop bundles initialization, condition and update into one line, which makes counting loops compact and hard to get wrong. Use it when you know how many times you want to iterate.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    for (int i = 0; i < 5; i++) {
        cout << i << " ";
    }
    cout << endl;
    return 0;
}`,
          "0 1 2 3 4"
        ),
        points: [
          "for (init; condition; update) runs init once, then loops while condition holds.",
          "Loop variable i is usually declared inside the for statement.",
        ],
      }),
      L({
        slug: "break-continue",
        title: "break & continue",
        shortDescription: "Control loop flow: exit early with break, skip ahead with continue.",
        body: "break immediately exits the nearest loop. continue skips the rest of the current iteration and jumps to the next one. Together they let you express loop logic without deeply nested ifs.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    for (int i = 1; i <= 10; i++) {
        if (i == 8) break;      // stop entirely
        if (i % 2 == 0) continue; // skip evens
        cout << i << " ";
    }
    cout << endl;
    return 0;
}`,
          "1 3 5 7"
        ),
        points: [
          "break leaves the loop; continue skips to the next iteration.",
          "In nested loops, they affect only the innermost loop.",
        ],
      }),
    ],
  },
  {
    title: "Module 6: Functions",
    lessons: [
      L({
        slug: "function-basics",
        title: "Function Basics",
        shortDescription: "Package reusable logic into named functions.",
        body: "A function is a named block of code you can call whenever you need it. Declare a return type, a name and a parameter list, then define the body. Functions keep programs organized and free of duplication.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

void greet() {
    cout << "Hello from a function!" << endl;
}

int main() {
    greet();
    greet();
    return 0;
}`,
          "Hello from a function!\nHello from a function!"
        ),
        points: [
          "void means the function returns nothing.",
          "Define functions above main(), or declare a prototype first.",
        ],
      }),
      L({
        slug: "parameters-return-values",
        title: "Parameters & Return Values",
        shortDescription: "Send data into functions and get results back.",
        body: "Parameters are the inputs a function receives; the return type describes what it hands back with return. A function that adds two numbers takes two int parameters and returns their sum.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int add(int a, int b) {
    return a + b;
}

int main() {
    int result = add(3, 4);
    cout << "3 + 4 = " << result << endl;
    return 0;
}`,
          "3 + 4 = 7"
        ),
        points: [
          "return exits the function immediately and hands back a value.",
          "The returned value must match (or convert to) the declared return type.",
        ],
      }),
      L({
        slug: "recursion",
        title: "Recursion & Overloading",
        shortDescription: "Functions that call themselves, and multiple functions sharing one name.",
        body: "A recursive function solves a problem by calling itself on a smaller input until it reaches a base case. Overloading lets several functions share a name as long as their parameter lists differ.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int factorial(int n) {
    if (n <= 1) return 1;      // base case
    return n * factorial(n - 1);
}

int main() {
    cout << "5! = " << factorial(5) << endl;
    return 0;
}`,
          "5! = 120"
        ),
        points: [
          "Every recursive function needs a base case to stop.",
          "Overloaded functions differ by number or types of parameters.",
        ],
        warn: "A missing base case causes infinite recursion and a stack overflow crash.",
      }),
    ],
  },
  {
    title: "Module 7: Arrays",
    lessons: [
      L({
        slug: "array-basics",
        title: "Array Basics",
        shortDescription: "Store many values of one type in a single indexed container.",
        body: "An array holds a fixed number of elements of the same type, accessed by index starting at 0. Arrays are the simplest container in C++ and are the foundation for understanding how data is stored in memory.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int scores[5] = {90, 85, 77, 92, 88};

    int total = 0;
    for (int i = 0; i < 5; i++) {
        total += scores[i];
    }
    cout << "Average: " << total / 5 << endl;
    return 0;
}`,
          "Average: 86"
        ),
        points: [
          "Indices run from 0 to size-1.",
          "The size must be a constant known at compile time.",
        ],
        warn: "Accessing scores[5] on a 5-element array is undefined behavior - a very common C++ bug.",
      }),
      L({
        slug: "multidimensional-arrays",
        title: "Multi-dimensional Arrays",
        shortDescription: "Grids of data: arrays of arrays.",
        body: "A 2D array is an array of arrays, perfect for grids, boards and matrices. You declare it with two sizes and access elements with two indices: grid[row][col].",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int grid[2][3] = {
        {1, 2, 3},
        {4, 5, 6}
    };

    for (int r = 0; r < 2; r++) {
        for (int c = 0; c < 3; c++) {
            cout << grid[r][c] << " ";
        }
        cout << endl;
    }
    return 0;
}`,
          "1 2 3\n4 5 6"
        ),
        points: [
          "grid[2][3] means 2 rows and 3 columns.",
          "Nested loops are the natural way to traverse 2D arrays.",
        ],
      }),
      L({
        slug: "arrays-and-functions",
        title: "Arrays & Functions",
        shortDescription: "Pass arrays into functions and understand how size travels with them.",
        body: "When you pass an array to a function, what actually arrives is a pointer to its first element, so the function also needs to know the length. Passing the size alongside the array is the standard pattern.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int sum(int arr[], int size) {
    int total = 0;
    for (int i = 0; i < size; i++) total += arr[i];
    return total;
}

int main() {
    int values[4] = {2, 4, 6, 8};
    cout << "Sum: " << sum(values, 4) << endl;
    return 0;
}`,
          "Sum: 20"
        ),
        points: [
          "int arr[] in a parameter list is really int* arr.",
          "Always pass the array size as a separate parameter.",
        ],
      }),
    ],
  },
  {
    title: "Module 8: Strings",
    lessons: [
      L({
        slug: "string-basics",
        title: "std::string Basics",
        shortDescription: "Work with text using the std::string type.",
        body: "std::string is a flexible text type that manages its own memory. You can concatenate with +, compare with ==, and read its length with .length(). Include <string> to use it.",
        code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

int main() {
    string first = "Code";
    string second = "Rush";
    string full = first + second;

    cout << full << endl;
    cout << "Length: " << full.length() << endl;
    return 0;
}`,
          "CodeRush\nLength: 8"
        ),
        points: [
          "Concatenate strings with +.",
          "Characters can be accessed by index like an array: full[0] is C.",
        ],
      }),
      L({
        slug: "string-methods",
        title: "String Methods",
        shortDescription: "substring, find, and friends for slicing and searching text.",
        body: "std::string ships with handy methods: substr(start, length) extracts a piece, find(needle) returns the position of a substring (or string::npos when missing), and insert/erase modify the string in place.",
        code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

int main() {
    string text = "CodeRush Academy";

    cout << text.substr(0, 8) << endl;    // CodeRush
    cout << text.find("Academy") << endl; // 9
    return 0;
}`,
          "CodeRush\n9"
        ),
        points: [
          "find returns string::npos when the substring is not present.",
          "substr takes a start index and a length, not an end index.",
        ],
      }),
      L({
        slug: "string-input",
        title: "String Input",
        shortDescription: "Read whole lines of text with getline, not just single words.",
        body: "cin >> name stops reading at the first space, which breaks for full names. getline(cin, name) reads the entire line including spaces, making it the right tool for user-typed sentences.",
        code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cout << "Enter your full name: ";
    getline(cin, name);
    cout << "Hi, " << name << "!" << endl;
    return 0;
}`,
          "Hi, Alex Carter!"
        ),
        points: [
          "Use getline(cin, str) for lines with spaces.",
          "Mixing cin >> and getline needs care: leftover newlines cause skipped reads.",
        ],
        note: "This example reads input, so try it in the code playground with custom input.",
      }),
    ],
  },
];

/* -------- C++ modules 9-11 -------- */

const cppModules911 = [
  {
    title: "Module 9: Pointers",
    lessons: [
      L({
        slug: "pointer-basics",
        title: "Pointer Basics",
        shortDescription: "Variables that store memory addresses.",
        body: "A pointer stores the address of another variable. The & operator takes the address of a variable, and * dereferences a pointer to reach the value it points to. Pointers unlock dynamic memory and efficient data structures.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int value = 42;
    int* ptr = &value;

    cout << "Value: " << value << endl;
    cout << "Address: " << ptr << endl;
    cout << "Via pointer: " << *ptr << endl;
    return 0;
}`,
          "Value: 42\nAddress: 0x7ffee...\nVia pointer: 42"
        ),
        points: [
          "int* p = &x; makes p point to x.",
          "*p reads or writes the value p points to.",
          "The printed address differs on every machine and run.",
        ],
      }),
      L({
        slug: "pointers-and-arrays",
        title: "Pointers & Arrays",
        shortDescription: "Why array names behave like pointers to their first element.",
        body: "An array name decays into a pointer to its first element in most expressions. You can walk an array with a pointer, and arr[i] is exactly the same as *(arr + i).",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

int main() {
    int arr[3] = {10, 20, 30};
    int* p = arr;

    cout << *p << " " << *(p + 1) << " " << *(p + 2) << endl;
    return 0;
}`,
          "10 20 30"
        ),
        points: [
          "arr and &arr[0] are the same address.",
          "Pointer arithmetic moves in elements, not bytes.",
        ],
      }),
      L({
        slug: "references",
        title: "References",
        shortDescription: "Safer aliases with the & reference type.",
        body: "A reference is an alias for an existing variable: once bound, it always refers to that variable. References are preferred over pointers for function parameters because they cannot be null and never need dereferencing.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

void doubleIt(int& n) {
    n = n * 2;
}

int main() {
    int x = 21;
    doubleIt(x);
    cout << x << endl; // 42
    return 0;
}`,
          "42"
        ),
        points: [
          "int& r = x; makes r another name for x.",
          "Passing int& lets a function modify the caller's variable.",
        ],
      }),
    ],
  },
  {
    title: "Module 10: OOP",
    lessons: [
      L({
        slug: "classes-objects",
        title: "Classes & Objects",
        shortDescription: "Bundle data and behavior into your own types.",
        body: "A class defines a new type with data members (fields) and member functions (methods). An object is one instance of that class. public members are accessible from outside; private members are hidden inside the class.",
        code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

class Player {
public:
    string name;
    int health;

    void attack() {
        cout << name << " attacks!" << endl;
    }
};

int main() {
    Player hero;
    hero.name = "Alex";
    hero.health = 100;
    hero.attack();
    return 0;
}`,
          "Alex attacks!"
        ),
        points: [
          "class Player { ... }; defines the type; Player hero; creates an object.",
          "public members form the interface; private members hide implementation.",
        ],
      }),
      L({
        slug: "constructors-destructors",
        title: "Constructors & Destructors",
        shortDescription: "Initialize objects automatically and clean up safely.",
        body: "A constructor has the same name as the class and runs when an object is created - perfect for setting initial values. A destructor (~ClassName) runs when the object is destroyed, often to release resources.",
        code: cppLessonCode(
`#include <iostream>
#include <string>
using namespace std;

class Player {
public:
    string name;

    Player(string n) {
        name = n;
        cout << name << " entered the game" << endl;
    }

    ~Player() {
        cout << name << " left the game" << endl;
    }
};

int main() {
    Player hero("Alex");
    return 0;
}`,
          "Alex entered the game\nAlex left the game"
        ),
        points: [
          "Constructors may be overloaded with different parameters.",
          "The destructor is called automatically when the object goes out of scope.",
        ],
      }),
      L({
        slug: "inheritance-polymorphism",
        title: "Inheritance & Polymorphism",
        shortDescription: "Build class families and choose behavior at runtime.",
        body: "Inheritance lets a derived class reuse and extend a base class. With virtual functions, a base-class pointer can call the right derived-class version at runtime - that is polymorphism.",
        code: cppLessonCode(
`#include <iostream>
using namespace std;

class Animal {
public:
    virtual void speak() { cout << "..." << endl; }
};

class Dog : public Animal {
public:
    void speak() override { cout << "Woof!" << endl; }
};

int main() {
    Dog d;
    Animal* a = &d;
    a->speak(); // Woof!
    return 0;
}`,
          "Woof!"
        ),
        points: [
          "class Dog : public Animal means Dog inherits from Animal.",
          "virtual enables runtime dispatch; override documents intent.",
        ],
      }),
    ],
  },
  {
    title: "Module 11: STL",
    lessons: [
      L({
        slug: "stl-vector",
        title: "vector",
        shortDescription: "A dynamic array that grows as needed.",
        body: "std::vector is the container you will reach for most. It stores elements contiguously, knows its own size, and can grow with push_back. Range-based for loops make iteration clean.",
        code: cppLessonCode(
`#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums;
    nums.push_back(10);
    nums.push_back(20);
    nums.push_back(30);

    cout << "Size: " << nums.size() << endl;
    for (int n : nums) cout << n << " ";
    cout << endl;
    return 0;
}`,
          "Size: 3\n10 20 30"
        ),
        points: [
          "push_back appends; size() reports the element count.",
          "Prefer vector over raw arrays in almost all modern C++ code.",
        ],
      }),
      L({
        slug: "stl-map-set",
        title: "map & set",
        shortDescription: "Key-value storage and unique-item collections.",
        body: "std::map stores key-value pairs sorted by key, and std::set stores unique sorted values. Both keep elements ordered and offer fast lookup.",
        code: cppLessonCode(
`#include <iostream>
#include <map>
#include <string>
using namespace std;

int main() {
    map<string, int> ages;
    ages["Alex"] = 21;
    ages["Sam"] = 19;

    cout << ages["Alex"] << endl;
    cout << ages.count("Sam") << endl;
    return 0;
}`,
          "21\n1"
        ),
        points: [
          "map[key] inserts or updates the value for that key.",
          "count(key) returns 1 if the key exists, 0 otherwise.",
        ],
      }),
      L({
        slug: "stl-algorithms",
        title: "Useful STL Algorithms",
        shortDescription: "sort, find, reverse and accumulate - batteries included.",
        body: "The <algorithm> header provides ready-made building blocks: sort, reverse, find and count all work on any container range. Combined with vector they remove most hand-written loop code.",
        code: cppLessonCode(
`#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> nums = {42, 7, 19, 3};
    sort(nums.begin(), nums.end());

    for (int n : nums) cout << n << " ";
    cout << endl;
    return 0;
}`,
          "3 7 19 42"
        ),
        quiz: quiz("C++ Fundamentals Final Quiz", [
          {
            question: "Which header do you need for cout and cin?",
            options: [
              { id: "a", text: "<string>" },
              { id: "b", text: "<iostream>" },
              { id: "c", text: "<vector>" },
              { id: "d", text: "<algorithm>" },
            ],
            correctAnswerId: "b",
            explanation: "<iostream> declares the standard input/output stream objects such as cout and cin.",
          },
          {
            question: "What does 17 % 5 evaluate to?",
            options: [
              { id: "a", text: "3" },
              { id: "b", text: "3.4" },
              { id: "c", text: "2" },
              { id: "d", text: "0" },
            ],
            correctAnswerId: "c",
            explanation: "% is the remainder operator: 17 divided by 5 is 3 with remainder 2.",
          },
          {
            question: "Which container grows dynamically as you add elements?",
            options: [
              { id: "a", text: "int[10]" },
              { id: "b", text: "std::vector" },
              { id: "c", text: "char" },
              { id: "d", text: "const int" },
            ],
            correctAnswerId: "b",
            explanation: "std::vector manages its own capacity and grows via push_back.",
          },
          {
            question: "Which keyword protects a variable from being modified?",
            options: [
              { id: "a", text: "static" },
              { id: "b", text: "final" },
              { id: "c", text: "const" },
              { id: "d", text: "lock" },
            ],
            correctAnswerId: "c",
            explanation: "const marks a value as read-only; attempts to modify it fail at compile time.",
          },
        ]),
      }),
    ],
  },
];

export const cppTech: SeedTechSeed = {
  technology: {
    name: "C++",
    slug: "cpp",
    description: "Systems programming, games and performance-critical software.",
    icon: "cpp",
    color: "#6366f1",
    sortOrder: 0,
  },
  courses: [{
    ...cppCourse,
    modules: [...cppCourse.modules, ...cppModules58, ...cppModules911],
  }],
};

/* ================================================================
   HTML FUNDAMENTALS
   ================================================================ */


const htmlTech: SeedTechSeed = {
  technology: {
    name: "HTML",
    slug: "html",
    description: "The structure of every web page - elements, forms, tables and semantics.",
    icon: "html",
    color: "#f97316",
    sortOrder: 1,
  },
  courses: [
    {
      course: {
        title: "HTML Fundamentals",
        slug: "html-fundamentals",
        description: "Learn to structure web pages with HTML: elements, links, images, lists, tables, forms and semantic markup.",
        difficulty: "beginner",
        durationMinutes: 120,
        xpReward: 100,
      },
      modules: [
        {
          title: "Module 1: Getting Started",
          lessons: [
            L({
              slug: "what-is-html",
              title: "What is HTML?",
              shortDescription: "HTML is the skeleton of every website you have ever visited.",
              body: "HTML (HyperText Markup Language) describes the structure of a web page using elements written as tags. Browsers read HTML and render it as the page you see. It defines what things are - headings, paragraphs, links, images - while CSS (later in your journey) defines how they look.",
              points: [
                "HTML documents are made of elements written as <tag>content</tag>.",
                "HTML describes structure and meaning, not styling.",
                "Every website you visit is built on HTML.",
              ],
            }),
            L({
              slug: "first-web-page",
              title: "Your First Web Page",
              shortDescription: "Write a complete, valid HTML page and preview it live.",
              body: "Below is a complete HTML page. It starts with the doctype, then the <html> element containing a <head> (metadata) and a <body> (visible content). Edit the code and watch the preview update - that is really all a web page is.",
              code: {
                language: "html",
                code: `<h1>Hello, CodeRush!</h1>
<p>This is my first web page.</p>
<p>I am learning HTML.</p>`,
                expectedOutput: "A heading and two paragraphs render in the preview.",
                runnable: true,
              },
              points: [
                "<!DOCTYPE html> tells the browser to use modern HTML.",
                "<head> holds metadata; <body> holds visible content.",
              ],
              exercise: {
                title: "Build an about-me card",
                difficulty: "beginner",
                question: "Create a mini page with your name as a heading and two sentences about yourself as paragraphs.",
                instructions: [
                  "Add an <h1> with your name.",
                  "Add two <p> paragraphs about yourself.",
                  "Preview the result, then submit.",
                ],
                starterCode: `<h1><!-- your name --></h1>
<p><!-- sentence one --></p>
<p><!-- sentence two --></p>`,
                language: "html",
                hints: ["Headings are <h1> to <h6>.", "Paragraphs are <p>...</p>."],
              },
            }),
            L({
              slug: "html-structure",
              title: "Document Structure & Nesting",
              shortDescription: "How elements nest inside each other and why indentation matters.",
              body: "HTML forms a tree: <html> contains <head> and <body>, which contain more elements. Elements must be properly nested - the last tag opened must be the first closed. Indentation is not required by the browser but is essential for humans reading the code.",
              code: {
                language: "html",
                code: `<div>
  <h1>Nested elements</h1>
  <div>
    <p>Each child is indented one level.</p>
  </div>
</div>`,
                runnable: true,
              },
              points: [
                "Think of HTML as a family tree of elements.",
                "Improperly nested tags cause unpredictable rendering.",
              ],
            }),
          ],
        },
        {
          title: "Module 2: Text & Content",
          lessons: [
            L({
              slug: "headings-paragraphs",
              title: "Headings & Paragraphs",
              shortDescription: "h1-h6 for structure, p for prose.",
              body: "Headings (<h1> to <h6>) define the outline of a page; use exactly one <h1> per page and do not skip levels. Paragraphs (<p>) hold blocks of text, and <strong>/<em> add inline emphasis.",
              code: {
                language: "html",
                code: `<h1>Learning HTML</h1>
<h2>Text elements</h2>
<p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p>`,
                runnable: true,
              },
              points: [
                "Headings create the document outline for readers and search engines.",
                "<strong> means strong importance; <em> means emphasis.",
              ],
            }),
            L({
              slug: "links",
              title: "Links",
              shortDescription: "Connect pages with the anchor element.",
              body: "The <a> element creates hyperlinks. The href attribute says where to go; the text between the tags is what the user clicks. Links are what turn a document into the web.",
              code: {
                language: "html",
                code: `<a href="https://coderush.example">Visit CodeRush</a>
<a href="#section2">Jump to a section</a>`,
                runnable: true,
              },
              points: [
                "href can be a full URL, a relative path, or an anchor (#id).",
                "Link text should describe the destination, never just click here.",
              ],
            }),
            L({
              slug: "images",
              title: "Images",
              shortDescription: "Embed pictures with alt text for accessibility.",
              body: "The <img> element embeds an image. It is a void element (no closing tag) and requires src for the image location plus alt text describing the image for screen readers and when loading fails.",
              code: {
                language: "html",
                code: `<img src="https://placehold.co/240x120" alt="A placeholder image" width="240">`,
                runnable: true,
              },
              points: [
                "Always provide meaningful alt text.",
                "img has no closing tag - it is self-contained.",
              ],
            }),
          ],
        },
        {
          title: "Module 3: Lists & Tables",
          lessons: [
            L({
              slug: "lists",
              title: "Ordered & Unordered Lists",
              shortDescription: "ul, ol and li for structured content.",
              body: "<ul> creates bulleted lists, <ol> creates numbered lists, and each item is an <li>. Lists are also the standard way to mark up menus and navigation.",
              code: {
                language: "html",
                code: `<ul>
  <li>Learn HTML</li>
  <li>Learn CSS</li>
  <li>Learn JavaScript</li>
</ul>
<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>`,
                runnable: true,
              },
              points: ["Only <li> elements may be direct children of ul/ol.", "ol numbers items automatically."],
            }),
            L({
              slug: "tables",
              title: "Tables",
              shortDescription: "Rows and columns of data with table, tr, th and td.",
              body: "Tables arrange data in rows (<tr>) and cells (<td>), with <th> for header cells. Use tables for data, never for page layout.",
              code: {
                language: "html",
                code: `<table>
  <tr><th>Language</th><th>Use</th></tr>
  <tr><td>HTML</td><td>Structure</td></tr>
  <tr><td>CSS</td><td>Style</td></tr>
</table>`,
                runnable: true,
              },
              points: ["th cells are bold and centered by default.", "Borders need CSS - tables are unstyled by default."],
            }),
          ],
        },
        {
          title: "Module 4: Forms",
          lessons: [
            L({
              slug: "form-basics",
              title: "Form Basics",
              shortDescription: "Collect user input with form elements.",
              body: "The <form> element wraps input controls such as <input>, <textarea> and <select>. Each control should have a name attribute so the data can be identified, and a matching <label> for accessibility.",
              code: {
                language: "html",
                code: `<form>
  <label for="user">Username</label>
  <input id="user" name="user" type="text">
  <button type="submit">Sign up</button>
</form>`,
                runnable: true,
              },
              points: ["label for must match the input id.", "The name attribute is what identifies the field when submitting."],
            }),
            L({
              slug: "input-types",
              title: "Input Types",
              shortDescription: "text, email, password, number, checkbox and more.",
              body: "The type attribute changes how an input behaves: email shows a mobile email keyboard and validates the format, number adds spinner controls, checkbox toggles on/off, and date opens a date picker.",
              code: {
                language: "html",
                code: `<input type="email" placeholder="you@example.com">
<input type="password" placeholder="Password">
<input type="number" min="1" max="10">
<input type="checkbox"> Subscribe`,
                runnable: true,
              },
              points: ["Browser validation comes free with type=email/number.", "Use the right type - it improves both UX and accessibility."],
            }),
          ],
        },
        {
          title: "Module 5: Semantic HTML",
          lessons: [
            L({
              slug: "semantic-elements",
              title: "Semantic Layout Elements",
              shortDescription: "header, nav, main, section and footer describe meaning.",
              body: "Instead of naming everything <div>, HTML offers semantic elements that describe their purpose: <header>, <nav>, <main>, <section>, <article> and <footer>. They make code readable and help assistive technology understand the page.",
              code: {
                language: "html",
                code: `<header><h1>My Blog</h1></header>
<nav><a href="#">Home</a></nav>
<main>
  <article><h2>Post title</h2><p>Content...</p></article>
</main>
<footer><p>Copyright</p></footer>`,
                runnable: true,
              },
              points: ["Semantic elements communicate meaning, not just boxes.", "There should be one <main> per page."],
            }),
            L({
              slug: "html-best-practices",
              title: "Accessibility & Best Practices",
              shortDescription: "Alt text, labels, headings and valid structure.",
              body: "Accessible HTML is good HTML: meaningful alt text, labeled form controls, a single h1, logical heading order, and lang on <html>. Validate your pages and test with the keyboard only.",
              points: [
                "Every image needs alt text; every input needs a label.",
                "Use headings to create an outline, not for font sizes.",
              ],
              quiz: quiz("HTML Fundamentals Final Quiz", [
                {
                  question: "Which element creates a hyperlink?",
                  options: [
                    { id: "a", text: "<link>" },
                    { id: "b", text: "<a>" },
                    { id: "c", text: "<href>" },
                    { id: "d", text: "<url>" },
                  ],
                  correctAnswerId: "b",
                  explanation: "The anchor element <a href='...'> creates hyperlinks. <link> is for document metadata like stylesheets.",
                },
                {
                  question: "What attribute provides text for screen readers on images?",
                  options: [
                    { id: "a", text: "title" },
                    { id: "b", text: "caption" },
                    { id: "c", text: "alt" },
                    { id: "d", text: "label" },
                  ],
                  correctAnswerId: "c",
                  explanation: "alt text describes the image content for accessibility and fallback display.",
                },
                {
                  question: "Which element should wrap the unique main content of a page?",
                  options: [
                    { id: "a", text: "<div>" },
                    { id: "b", text: "<main>" },
                    { id: "c", text: "<section>" },
                    { id: "d", text: "<body>" },
                  ],
                  correctAnswerId: "b",
                  explanation: "<main> marks the primary content and should appear only once per page.",
                },
              ]),
            }),
          ],
        },
      ],
    },
  ],
};

/* ================================================================
   CSS FUNDAMENTALS
   ================================================================ */

const cssTech: SeedTechSeed = {
  technology: {
    name: "CSS",
    slug: "css",
    description: "Style the web: colors, typography, the box model, flexbox, grid and responsive design.",
    icon: "css",
    color: "#38bdf8",
    sortOrder: 2,
  },
  courses: [
    {
      course: {
        title: "CSS Fundamentals",
        slug: "css-fundamentals",
        description: "Learn to style web pages with CSS: selectors, colors, text, the box model, flexbox, grid and responsive design.",
        difficulty: "beginner",
        durationMinutes: 140,
        xpReward: 100,
      },
      modules: [
        {
          title: "Module 1: CSS Basics",
          lessons: [
            L({
              slug: "what-is-css",
              title: "What is CSS?",
              shortDescription: "CSS turns plain documents into polished interfaces.",
              body: "CSS (Cascading Style Sheets) describes how HTML elements should look: colors, sizes, spacing, layout and animation. Rules are made of a selector and declarations, and they cascade - multiple rules can target the same element with clear precedence rules.",
              points: [
                "A rule = selector { property: value; }.",
                "Cascade means styles layer; specificity decides who wins.",
              ],
            }),
            L({
              slug: "css-selectors",
              title: "Selectors & Specificity",
              shortDescription: "Target elements by tag, class, id and relationship.",
              body: "Selectors choose which elements a rule styles. Tag selectors hit every instance, .class selectors hit elements with that class, #id hits one unique element, and combinators like .card p target descendants. Practice them live below.",
              code: {
                language: "css",
                code: `h1 { color: #818cf8; }
.note { border: 1px solid #334155; padding: 8px; }
#hero { background: #1e1b4b; }
.note p { margin: 0; }`,
                runnable: true,
              },
              points: [
                "Classes are reusable; ids are unique per page.",
                "Specificity: id beats class beats tag.",
              ],
              exercise: {
                title: "Style a notification",
                difficulty: "beginner",
                question: "Write CSS that styles every element with the class .alert to have red text and a solid border.",
                instructions: [
                  "Target the .alert class.",
                  "Set color to red (or a red hex).",
                  "Add 2px solid padding via border and padding.",
                  "Preview and submit.",
                ],
                starterCode: `.alert {
  /* TODO: color, border, padding */
}`,
                language: "css",
                hints: ["Class selectors start with a dot.", "border: 2px solid red; is one line."],
              },
            }),
            L({
              slug: "adding-css",
              title: "Adding CSS to a Page",
              shortDescription: "Inline styles, <style> blocks and external stylesheets.",
              body: "CSS reaches a page three ways: a style attribute on one element, a <style> block inside the page, or - best practice - an external .css file linked with <link>. External files cache and keep concerns separated.",
              code: {
                language: "html",
                code: `<style>
  p { color: #94a3b8; }
</style>
<p>Styled by a style block.</p>
<p style="color: #f472b6;">Styled inline.</p>`,
                runnable: true,
              },
              points: ["Prefer external stylesheets for real projects.", "Inline styles override everything - use sparingly."],
            }),
          ],
        },
        {
          title: "Module 2: Colors & Text",
          lessons: [
            L({
              slug: "css-colors",
              title: "Colors & Backgrounds",
              shortDescription: "Named colors, hex, rgb and hsl plus backgrounds.",
              body: "CSS colors can be written as names, hex (#38bdf8), rgb(56, 189, 248) or hsl(199, 96%, 60%). The color property styles text; background-color fills the element behind the content.",
              code: {
                language: "css",
                code: `body { background: #0f172a; color: #e2e8f0; }
h1 { color: #38bdf8; }
.card { background: #1e293b; padding: 12px; }`,
                runnable: true,
              },
              points: ["Hex is the most common format in real projects.", "hsl makes it easy to build shades of one hue."],
            }),
            L({
              slug: "fonts-text",
              title: "Fonts & Text Styling",
              shortDescription: "font-family, size, weight, line-height and letter-spacing.",
              body: "Typography is most of web design. font-family sets a fallback list, font-size uses rem for scalable text, line-height controls readability, and text-align/letter-spacing fine-tune the result.",
              code: {
                language: "css",
                code: `body {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
h1 { font-size: 2rem; letter-spacing: 0.02em; }`,
                runnable: true,
              },
              points: ["Use rem so text scales with user preferences.", "line-height around 1.5-1.6 is comfortable for body text."],
            }),
          ],
        },
        {
          title: "Module 3: The Box Model",
          lessons: [
            L({
              slug: "box-model",
              title: "The Box Model",
              shortDescription: "Content, padding, border and margin on every element.",
              body: "Every element is a box: content at the center, then padding, then border, then margin. box-sizing: border-box makes width include padding and border, which is how most modern projects set it.",
              code: {
                language: "css",
                code: `* { box-sizing: border-box; }
.box {
  width: 200px;
  padding: 16px;
  border: 2px solid #38bdf8;
  margin: 12px;
}`, 
                runnable: true,
              },
              points: ["Padding is inside the border; margin is outside.", "border-box makes width calculations intuitive."],
            }),
            L({
              slug: "spacing",
              title: "Margin, Padding & Borders",
              shortDescription: "Spacing directions, shorthand and border radius.",
              body: "Spacing properties accept one to four values (top right bottom left) and per-side variants like margin-top. border-radius rounds corners - 9999px makes pills.",
              code: {
                language: "css",
                code: `.pill {
  padding: 8px 16px;
  border: 1px solid #38bdf8;
  border-radius: 9999px;
  display: inline-block;
}`, 
                runnable: true,
              },
              points: ["margin: 8px 16px means 8px vertical, 16px horizontal.", "Shorthand order is top, right, bottom, left (clockwise)."],
            }),
          ],
        },
        {
          title: "Module 4: Layout",
          lessons: [
            L({
              slug: "display-position",
              title: "Display & Positioning",
              shortDescription: "block, inline, flex, grid, relative and absolute.",
              body: "display decides how an element participates in layout; position decides how it is placed. position: absolute pins an element inside the nearest positioned ancestor - the key to badges and overlays.",
              code: {
                language: "css",
                code: `.wrapper { position: relative; }
.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 9999px;
  padding: 2px 8px;
  font-size: 12px;
}`, 
                runnable: true,
              },
              points: ["Absolute positioning needs a positioned ancestor.", "static is the default; relative opens positioning context."],
            }),
            L({
              slug: "flexbox",
              title: "Flexbox",
              shortDescription: "One-dimensional layout with justify-content and align-items.",
              body: "display: flex arranges children in a row (or column with flex-direction). justify-content distributes along the main axis, align-items across it, and gap adds spacing without margins.",
              code: {
                language: "css",
                code: `.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}`,
                runnable: true,
              },
              points: ["Flexbox is for one dimension: a row or a column.", "gap works in flex and grid - no more margin hacks."],
            }),
            L({
              slug: "css-grid",
              title: "CSS Grid",
              shortDescription: "Two-dimensional layouts with rows and columns.",
              body: "display: grid defines both rows and columns at once. grid-template-columns with repeat and fr units creates fluid column layouts, the standard approach for card grids.",
              code: {
                language: "css",
                code: `.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}`,
                runnable: true,
              },
              points: ["fr means fraction of free space.", "auto-fill + minmax creates responsive grids with no media queries."],
            }),
          ],
        },
        {
          title: "Module 5: Responsive & Polish",
          lessons: [
            L({
              slug: "media-queries",
              title: "Media Queries",
              shortDescription: "Apply styles based on screen size and other conditions.",
              body: "A media query wraps rules that apply only when a condition holds, typically a max-width. They are the backbone of responsive design: same HTML, different presentation per device.",
              code: {
                language: "css",
                code: `.title { font-size: 2rem; }

@media (max-width: 600px) {
  .title { font-size: 1.4rem; }
}`,
                runnable: true,
              },
              points: ["Design mobile-first, then add min-width queries.", "Common breakpoints: 600px, 768px, 1024px."],
            }),
            L({
              slug: "transitions-pseudo",
              title: "Transitions & Pseudo-classes",
              shortDescription: "Smooth hover effects with transition and :hover.",
              body: "transition interpolates property changes over time, and pseudo-classes like :hover and :focus style interaction states. Together they create the polished hover effects seen across modern UIs.",
              code: {
                language: "css",
                code: `.btn {
  background: #6366f1;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background 0.2s;
}
.btn:hover { background: #4f46e5; }`,
                runnable: true,
              },
              points: ["Transition the specific properties you change.", "Hover styles do not exist on touch screens - never hide functionality behind them."],
              quiz: quiz("CSS Fundamentals Final Quiz", [
                {
                  question: "Which display value arranges children in a row or column?",
                  options: [
                    { id: "a", text: "display: block" },
                    { id: "b", text: "display: flex" },
                    { id: "c", text: "display: inline" },
                    { id: "d", text: "display: none" },
                  ],
                  correctAnswerId: "b",
                  explanation: "Flexbox lays out children along one axis (row or column).",
                },
                {
                  question: "With box-sizing: border-box, width: 200px includes...",
                  options: [
                    { id: "a", text: "only the content" },
                    { id: "b", text: "content + padding + border" },
                    { id: "c", text: "content + margin" },
                    { id: "d", text: "everything including margin" },
                  ],
                  correctAnswerId: "b",
                  explanation: "border-box makes the declared width cover content, padding and border.",
                },
                {
                  question: "Which selector has the highest specificity?",
                  options: [
                    { id: "a", text: ".card" },
                    { id: "b", text: "p" },
                    { id: "c", text: "#hero" },
                    { id: "d", text: "*" },
                  ],
                  correctAnswerId: "c",
                  explanation: "Ids are more specific than classes, which are more specific than tags.",
                },
              ]),
            }),
          ],
        },
      ],
    },
  ],
};

/* ================================================================
   JAVASCRIPT FUNDAMENTALS
   ================================================================ */

function jsCode(code: string, expectedOutput: string) {
  return { language: "javascript", code, expectedOutput, runnable: true };
}

const javascriptTech: SeedTechSeed = {
  technology: {
    name: "JavaScript",
    slug: "javascript",
    description: "The language of the web: variables, functions, the DOM and modern ES6+ features.",
    icon: "javascript",
    color: "#facc15",
    sortOrder: 3,
  },
  courses: [
    {
      course: {
        title: "JavaScript Fundamentals",
        slug: "javascript-fundamentals",
        description: "Learn JavaScript from zero: variables, types, control flow, functions, arrays, objects and the DOM.",
        difficulty: "beginner",
        durationMinutes: 180,
        xpReward: 100,
      },
      modules: [
        {
          title: "Module 1: JavaScript Basics",
          lessons: [
            L({
              slug: "what-is-javascript",
              title: "What is JavaScript?",
              shortDescription: "The programming language that makes web pages interactive.",
              body: "JavaScript started as a way to make web pages interactive and now runs everywhere: browsers, servers (Node.js), mobile apps and even desktop apps. In this course you write it in the browser and the console.",
              points: [
                "JavaScript runs in every browser without installation.",
                "Node.js brings the same language to servers.",
              ],
            }),
            L({
              slug: "first-script",
              title: "Your First Script",
              shortDescription: "Print output with console.log and run your first program.",
              body: "console.log prints values to the console - your best friend while learning. The code below logs a greeting; press Run Code to execute it and see the output panel.",
              code: jsCode(`const greeting = "Hello, CodeRush!";
console.log(greeting);
console.log("2 + 2 =", 2 + 2);`, 'Hello, CodeRush!\n2 + 2 = 4'),
              points: [
                "console.log prints any value, including computed expressions.",
                "Strings live in single quotes, double quotes or backticks.",
              ],
            }),
            L({
              slug: "variables-let-const",
              title: "Variables: let & const",
              shortDescription: "Store values with let (changeable) and const (fixed).",
              body: "Modern JavaScript declares variables with let for values that change and const for values that do not. Both are block-scoped. Prefer const by default and reach for let only when reassignment is needed.",
              code: jsCode(`let score = 0;
score = score + 10;
const maxScore = 100;
console.log(score, maxScore);`, '10 100'),
              points: [
                "const prevents reassignment; let allows it.",
                "var is legacy - avoid it in new code.",
              ],
              exercise: {
                title: "Greet a user",
                difficulty: "beginner",
                question: "Declare a const called name with your name and log a greeting to the console.",
                instructions: [
                  "Declare const name = ... with your name.",
                  "Log `Hello, <name>!` using console.log.",
                  "Run the code, then submit.",
                ],
                starterCode: `// TODO: declare name and log a greeting
`,
                language: "javascript",
                expectedOutput: "Hello, Alex!",
                hints: ["Use template literals: console.log(`Hello, ${name}!`)"] ,
              },
            }),
          ],
        },
        {
          title: "Module 2: Types & Operators",
          lessons: [
            L({
              slug: "numbers-strings",
              title: "Numbers & Strings",
              shortDescription: "Numeric and text values, and how they convert.",
              body: "JavaScript has one number type for integers and decimals. Strings are text in quotes. The + operator adds numbers but concatenates strings - mixing them coerces the number to text, a frequent source of surprises.",
              code: jsCode(`console.log(10 + 5);        // 15
console.log("10" + 5);      // "105"
console.log(Number("10") + 5); // 15
console.log("a".toUpperCase());`, '15\n105\n15\nA'),
              points: [
                "Number(value) converts text to a number.",
                "String methods: toUpperCase, toLowerCase, trim, slice.",
              ],
              warn: '"10" + 5 is "105", not 15. Convert with Number() before doing math on user input.',
            }),
            L({
              slug: "booleans-comparisons",
              title: "Booleans & Comparisons",
              shortDescription: "true/false values and === versus ==.",
              body: "Comparisons produce booleans. Always use === (strict equality), which checks value AND type, over == which coerces types and causes subtle bugs. The logical operators && and || combine conditions.",
              code: jsCode(`console.log(5 === "5"); // false
console.log(5 === 5);   // true
console.log(5 !== 4);   // true
console.log(true && false); // false`, 'false\ntrue\ntrue\nfalse'),
              points: [
                "=== is strict; == is loose and best avoided.",
                "! reverses a boolean; && needs both true; || needs one.",
              ],
            }),
          ],
        },
        {
          title: "Module 3: Control Flow",
          lessons: [
            L({
              slug: "if-else-js",
              title: "if / else",
              shortDescription: "Branch your code with conditions.",
              body: "if/else works the same as in other languages: test a condition, run a block if true, optionally test more with else if, and fall back to else.",
              code: jsCode(`const hour = 14;
if (hour < 12) {
  console.log("Good morning");
} else if (hour < 18) {
  console.log("Good afternoon");
} else {
  console.log("Good evening");
}`, 'Good afternoon'),
              points: ["Conditions do not need parentheses around assignments - only around the test.", "Braces are optional for one statement but always recommended."],
            }),
            L({
              slug: "loops-js",
              title: "Loops",
              shortDescription: "for, while and the modern for...of.",
              body: "Classic for loops count; while loops repeat on a condition; for...of iterates the values of an array directly. Prefer for...of when you just need each element.",
              code: jsCode(`for (let i = 0; i < 3; i++) console.log(i);
for (const fruit of ["apple", "pear"]) {
  console.log(fruit);
}`, '0\n1\n2\napple\npear'),
              points: ["for...of gives values; for...in gives keys (avoid it for arrays).", "break exits a loop; continue skips to the next iteration."],
            }),
          ],
        },
        {
          title: "Module 4: Functions",
          lessons: [
            L({
              slug: "function-basics-js",
              title: "Function Basics",
              shortDescription: "Declare, call and return from functions.",
              body: "Functions package reusable logic. Declare with the function keyword or as a const arrow function. Parameters are inputs; return sends a value back to the caller.",
              code: jsCode(`function add(a, b) {
  return a + b;
}
console.log(add(2, 3));`, '5'),
              points: ["return exits immediately with a value.", "Functions can be passed around like any other value."],
            }),
            L({
              slug: "arrow-functions",
              title: "Arrow Functions",
              shortDescription: "Compact syntax: const f = (a) => a + 1.",
              body: "Arrow functions are shorter and are the standard in modern code. With one expression they implicitly return it, and with one parameter the parentheses are optional.",
              code: jsCode(`const double = (n) => n * 2;
const greet = name => ` + "`Hi, " + "${" + "name}" + "!`" + `;
console.log(double(4));
console.log(greet("Alex"));`, '8\nHi, Alex!'),
              points: ["Single-expression arrows return implicitly.", "Arrow functions inherit this from their surroundings - important later with the DOM."],
            }),
          ],
        },
        {
          title: "Module 5: Arrays & Objects",
          lessons: [
            L({
              slug: "arrays-js",
              title: "Arrays",
              shortDescription: "Ordered collections with map, filter and find.",
              body: "Arrays store ordered values and come with powerful methods: map transforms each element, filter keeps matches, find returns the first match, and includes checks membership.",
              code: jsCode(`const nums = [1, 2, 3, 4];
console.log(nums.map(n => n * 10));
console.log(nums.filter(n => n % 2 === 0));
console.log(nums.find(n => n > 2));`, '[ 10, 20, 30, 40 ]\n[ 2, 4 ]\n3'),
              points: ["map returns a new array - it never mutates the original.", "Arrays are zero-indexed: nums[0] is the first element."],
            }),
            L({
              slug: "objects-js",
              title: "Objects",
              shortDescription: "Key-value records and how to read and update them.",
              body: "Objects group related data under named keys. Read with dot notation (user.name) or brackets (user['name']), update by assignment, and add new keys on the fly.",
              code: jsCode(`const user = { name: "Alex", xp: 120 };
user.xp += 30;
user.level = 2;
console.log(user.name, user.xp, user.level);`, 'Alex 150 2'),
              points: ["Dot notation for known keys; brackets for dynamic keys.", "Object.keys/values/entries turn objects into arrays."],
              quiz: quiz("JavaScript Fundamentals Final Quiz", [
                {
                  question: "Which keyword declares a value that cannot be reassigned?",
                  options: [
                    { id: "a", text: "let" },
                    { id: "b", text: "var" },
                    { id: "c", text: "const" },
                    { id: "d", text: "final" },
                  ],
                  correctAnswerId: "c",
                  explanation: "const bindings cannot be reassigned (though object contents can still change).",
                },
                {
                  question: "What is the result of '5' + 3?",
                  options: [
                    { id: "a", text: "8" },
                    { id: "b", text: '"53"' },
                    { id: "c", text: "NaN" },
                    { id: "d", text: "Error" },
                  ],
                  correctAnswerId: "b",
                  explanation: "When either operand is a string, + concatenates instead of adding.",
                },
                {
                  question: "Which array method returns a NEW array with each element transformed?",
                  options: [
                    { id: "a", text: "forEach" },
                    { id: "b", text: "map" },
                    { id: "c", text: "filter" },
                    { id: "d", text: "find" },
                  ],
                  correctAnswerId: "b",
                  explanation: "map applies a function to every element and collects the results in a new array.",
                },
                {
                  question: "Why prefer === over ==?",
                  options: [
                    { id: "a", text: "It is faster" },
                    { id: "b", text: "It compares without converting types" },
                    { id: "c", text: "It also compares objects deeply" },
                    { id: "d", text: "No real difference" },
                  ],
                  correctAnswerId: "b",
                  explanation: "=== checks value and type, avoiding surprising coercions like 5 == '5'.",
                },
              ]),
            }),
          ],
        },
      ],
    },
  ],
};

/* ================================================================
   CURRICULUM EXPORT
   ================================================================ */

export function buildSeedCurriculum(): SeedTechSeed[] {
  return [cppTech, htmlTech, cssTech, javascriptTech];
}
