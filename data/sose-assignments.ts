import type { SoSEAssignment } from "@/lib/types-sose"

// ─── Assignment definitions ────────────────────────────────────────────────────
// Each assignment ships with starter files, grading config, and a full rubric.
// The grading agent reads these at submission time.

export const SOSE_ASSIGNMENTS: SoSEAssignment[] = [
  // ── 1. Todo CLI Manager ─────────────────────────────────────────────────────
  {
    assignmentId: "todo-cli-manager",
    title: "CLI Todo Manager",
    subtitle: "Build a command-line task manager with file persistence",
    description: `Design and implement a command-line Todo Manager in Python.

**Requirements:**
- A \`Todo\` class with \`id\`, \`title\`, \`done\` fields
- A \`TodoManager\` class that stores todos in a JSON file (\`todos.json\`)
- Functions: \`add_todo(title)\`, \`list_todos()\`, \`complete_todo(id)\`, \`delete_todo(id)\`
- A \`main()\` function that accepts CLI args: \`add <title>\`, \`list\`, \`done <id>\`, \`delete <id>\`

**Example usage:**
\`\`\`
python main.py add "Buy groceries"
python main.py list
python main.py done 1
python main.py delete 1
\`\`\``,
    difficulty: "beginner",
    language: "python",
    estimatedMins: 45,
    objectives: [
      "Model data with Python classes",
      "Read and write JSON files",
      "Handle command-line arguments with sys.argv",
      "Write unit tests with pytest",
    ],
    starterFiles: {
      "main.py": `import json
import sys
import os
from dataclasses import dataclass, field, asdict
from typing import List

TODO_FILE = "todos.json"

# ── Data model ────────────────────────────────────────────────────────────────

@dataclass
class Todo:
    id: int
    title: str
    done: bool = False


# ── Manager ───────────────────────────────────────────────────────────────────

class TodoManager:
    def __init__(self):
        self.todos: List[Todo] = []
        self._load()

    def _load(self):
        """Load todos from todos.json. Create file if it doesn't exist."""
        # TODO: implement loading
        pass

    def _save(self):
        """Persist todos to todos.json."""
        # TODO: implement saving
        pass

    def add_todo(self, title: str) -> Todo:
        """Add a new todo and return it."""
        # TODO: implement
        pass

    def list_todos(self) -> List[Todo]:
        """Return all todos."""
        return self.todos

    def complete_todo(self, todo_id: int) -> bool:
        """Mark a todo as done. Return True if found, False otherwise."""
        # TODO: implement
        pass

    def delete_todo(self, todo_id: int) -> bool:
        """Delete a todo. Return True if found, False otherwise."""
        # TODO: implement
        pass


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    manager = TodoManager()
    args = sys.argv[1:]

    if not args:
        print("Usage: python main.py [add|list|done|delete] [args]")
        return

    command = args[0]

    if command == "add":
        if len(args) < 2:
            print("Error: provide a title")
            return
        title = " ".join(args[1:])
        todo = manager.add_todo(title)
        print(f"Added: [{todo.id}] {todo.title}")

    elif command == "list":
        todos = manager.list_todos()
        if not todos:
            print("No todos yet.")
        for t in todos:
            status = "✓" if t.done else "○"
            print(f"  {status} [{t.id}] {t.title}")

    elif command == "done":
        if len(args) < 2:
            print("Error: provide an id")
            return
        found = manager.complete_todo(int(args[1]))
        print("Marked done." if found else "Todo not found.")

    elif command == "delete":
        if len(args) < 2:
            print("Error: provide an id")
            return
        found = manager.delete_todo(int(args[1]))
        print("Deleted." if found else "Todo not found.")

    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
`,
      "test_main.py": `import pytest
import json
import os
from main import Todo, TodoManager

# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_todo_file(tmp_path, monkeypatch):
    """Each test gets a fresh todos.json in a temp directory."""
    monkeypatch.chdir(tmp_path)
    yield
    # cleanup handled by tmp_path

# ── Tests ─────────────────────────────────────────────────────────────────────

def test_add_todo():
    manager = TodoManager()
    todo = manager.add_todo("Buy milk")
    assert todo.title == "Buy milk"
    assert todo.done is False
    assert isinstance(todo.id, int)

def test_list_todos_empty():
    manager = TodoManager()
    assert manager.list_todos() == []

def test_list_todos_after_add():
    manager = TodoManager()
    manager.add_todo("Task A")
    manager.add_todo("Task B")
    assert len(manager.list_todos()) == 2

def test_complete_todo():
    manager = TodoManager()
    todo = manager.add_todo("Fix bug")
    result = manager.complete_todo(todo.id)
    assert result is True
    assert manager.list_todos()[0].done is True

def test_complete_nonexistent_todo():
    manager = TodoManager()
    result = manager.complete_todo(999)
    assert result is False

def test_delete_todo():
    manager = TodoManager()
    todo = manager.add_todo("Delete me")
    result = manager.delete_todo(todo.id)
    assert result is True
    assert len(manager.list_todos()) == 0

def test_delete_nonexistent_todo():
    manager = TodoManager()
    result = manager.delete_todo(999)
    assert result is False

def test_persistence():
    """Todos must survive a fresh manager load."""
    manager = TodoManager()
    manager.add_todo("Persistent task")
    
    # Load fresh instance — should see the same data
    manager2 = TodoManager()
    todos = manager2.list_todos()
    assert len(todos) == 1
    assert todos[0].title == "Persistent task"

def test_ids_are_unique():
    manager = TodoManager()
    t1 = manager.add_todo("A")
    t2 = manager.add_todo("B")
    assert t1.id != t2.id
`,
      "README.md": `# CLI Todo Manager

## Running
\`\`\`bash
python main.py add "Buy groceries"
python main.py list
python main.py done 1
python main.py delete 1
\`\`\`

## Testing
\`\`\`bash
pytest test_main.py -v
\`\`\`
`,
    },
    checks: [
      { id: "syntax",   label: "Python syntax valid",       weight: 10, required: true },
      { id: "tests",    label: "Pytest test suite",          weight: 50 },
      { id: "quality",  label: "Code structure & quality",   weight: 25 },
      { id: "design",   label: "OOP & file persistence",     weight: 15 },
    ],
    grading: {
      installCmd: "pip install pytest --quiet 2>&1",
      buildCmd: "python -m py_compile main.py",
      testCmd: "python -m pytest test_main.py -v --tb=short --no-header 2>&1",
      entryFile: "main.py",
      expectedBehaviourDesc:
        "A CLI Todo Manager that stores todos in a JSON file. Supports add, list, done, delete commands. Uses OOP (Todo dataclass + TodoManager class). Todos persist across process restarts.",
      rubric: `Grade this Python CLI Todo Manager submission:

SCORING CRITERIA:
1. Syntax & imports (10pts): Code compiles without syntax errors
2. Test passage (50pts): Score proportional to pytest pass rate  
3. Code quality (25pts): 
   - Uses dataclasses or proper classes
   - Clean function names and separation of concerns
   - Handles edge cases (empty file, missing todo_id)
   - Readable code with comments
4. OOP & persistence (15pts):
   - Todo class properly models data
   - TodoManager correctly loads/saves JSON
   - IDs are unique and auto-incremented

Deduct points for:
- Not implementing save/load (persistence broken)
- Hardcoded data instead of reading from file
- Missing error handling for invalid IDs
- Unimplemented stub functions (pass statements left in)`,
    },
  },

  // ── 2. Word Frequency Analyzer ──────────────────────────────────────────────
  {
    assignmentId: "word-frequency-analyzer",
    title: "Word Frequency Analyzer",
    subtitle: "Process text and surface insights with data structures",
    description: `Build a text analysis tool that reads a text file and reports word frequency statistics.

**Requirements:**
- \`WordAnalyzer\` class that accepts a filename in its constructor
- \`load()\` method: reads the file, tokenizes (lowercase, strip punctuation), stores words
- \`top_n(n)\` method: returns the \`n\` most common words as \`[(word, count), ...]\`
- \`unique_count()\` method: returns count of distinct words
- \`total_words()\` method: returns total word count
- \`search(word)\` method: returns frequency of a specific word (0 if not found)
- A \`main()\` entry point that prints a formatted report to stdout`,
    difficulty: "beginner",
    language: "python",
    estimatedMins: 40,
    objectives: [
      "Use Python collections (Counter, defaultdict)",
      "File I/O and string processing",
      "Write clean class APIs",
      "Handle edge cases robustly",
    ],
    starterFiles: {
      "main.py": `import re
import sys
from collections import Counter
from typing import List, Tuple


class WordAnalyzer:
    def __init__(self, filename: str):
        self.filename = filename
        self.words: List[str] = []
        self._counter: Counter = Counter()

    def load(self) -> None:
        """Read file, tokenize words (lowercase, strip punctuation), populate self.words."""
        # TODO: implement
        pass

    def top_n(self, n: int) -> List[Tuple[str, int]]:
        """Return the n most common words as [(word, count), ...]."""
        # TODO: implement
        pass

    def unique_count(self) -> int:
        """Return number of distinct words."""
        # TODO: implement
        pass

    def total_words(self) -> int:
        """Return total word count (including duplicates)."""
        # TODO: implement
        pass

    def search(self, word: str) -> int:
        """Return frequency of a word (0 if not found). Case-insensitive."""
        # TODO: implement
        pass


def main():
    if len(sys.argv) < 2:
        print("Usage: python main.py <filename>")
        return

    filename = sys.argv[1]
    analyzer = WordAnalyzer(filename)
    
    try:
        analyzer.load()
    except FileNotFoundError:
        print(f"Error: file '{filename}' not found")
        return

    print(f"=== Word Frequency Report: {filename} ===")
    print(f"Total words : {analyzer.total_words()}")
    print(f"Unique words: {analyzer.unique_count()}")
    print()
    print("Top 10 words:")
    for word, count in analyzer.top_n(10):
        bar = "█" * min(count, 40)
        print(f"  {word:<15} {count:>4}  {bar}")


if __name__ == "__main__":
    main()
`,
      "test_main.py": `import pytest
import os
from main import WordAnalyzer


@pytest.fixture
def sample_file(tmp_path):
    content = "the cat sat on the mat. The cat is fat."
    f = tmp_path / "sample.txt"
    f.write_text(content)
    return str(f)


@pytest.fixture
def empty_file(tmp_path):
    f = tmp_path / "empty.txt"
    f.write_text("")
    return str(f)


def test_load_and_total_words(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    assert a.total_words() == 10


def test_unique_count(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    assert a.unique_count() == 7  # the, cat, sat, on, mat, is, fat → 7 unique


def test_top_n(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    top = a.top_n(1)
    assert top[0][0] == "the"
    assert top[0][1] == 3


def test_search_found(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    assert a.search("cat") == 2


def test_search_not_found(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    assert a.search("dog") == 0


def test_search_case_insensitive(sample_file):
    a = WordAnalyzer(sample_file)
    a.load()
    assert a.search("THE") == a.search("the")


def test_empty_file(empty_file):
    a = WordAnalyzer(empty_file)
    a.load()
    assert a.total_words() == 0
    assert a.unique_count() == 0
    assert a.top_n(5) == []


def test_file_not_found():
    a = WordAnalyzer("nonexistent_file.txt")
    with pytest.raises(FileNotFoundError):
        a.load()
`,
      "sample.txt": `To be or not to be that is the question
Whether tis nobler in the mind to suffer
The slings and arrows of outrageous fortune
Or to take arms against a sea of troubles
And by opposing end them to die to sleep
No more and by a sleep to say we end
The heartache and the thousand natural shocks
That flesh is heir to tis a consummation
Devoutly to be wished to die to sleep
To sleep perchance to dream ay there is the rub`,
      "README.md": `# Word Frequency Analyzer

## Running
\`\`\`bash
python main.py sample.txt
\`\`\`

## Testing
\`\`\`bash
pytest test_main.py -v
\`\`\`
`,
    },
    checks: [
      { id: "syntax",   label: "Python syntax valid",       weight: 10, required: true },
      { id: "tests",    label: "Pytest test suite",          weight: 50 },
      { id: "quality",  label: "Code structure & quality",   weight: 25 },
      { id: "design",   label: "Algorithm & data structures",weight: 15 },
    ],
    grading: {
      installCmd: "pip install pytest --quiet 2>&1",
      buildCmd: "python -m py_compile main.py",
      testCmd: "python -m pytest test_main.py -v --tb=short --no-header 2>&1",
      entryFile: "main.py",
      expectedBehaviourDesc:
        "A WordAnalyzer class that loads a text file, tokenizes it (lowercase + strip punctuation), counts word frequencies using Counter, and exposes top_n, unique_count, total_words, and search methods.",
      rubric: `Grade this Python Word Frequency Analyzer submission:

SCORING CRITERIA:
1. Syntax (10pts): Code compiles without errors
2. Test passage (50pts): Proportional to pytest pass rate
3. Code quality (25pts):
   - Uses collections.Counter or equivalent
   - Properly normalizes text (lowercase, strip punctuation)
   - Clean, readable code
   - Handles edge cases (empty file, word not found)
4. Algorithm & design (15pts):
   - Efficient use of data structures
   - search() is case-insensitive
   - top_n() returns correctly sorted results
   - load() actually tokenizes (not just splits on spaces)`,
    },
  },

  // ── 3. Student Grade Tracker ─────────────────────────────────────────────────
  {
    assignmentId: "student-grade-tracker",
    title: "Student Grade Tracker",
    subtitle: "Build a grade management system with statistics",
    description: `Build a student grade tracking system in Python.

**Requirements:**
- \`Student\` dataclass: \`name\`, \`grades\` (list of floats)
- \`GradeTracker\` class that manages a collection of students
- Methods: \`add_student(name)\`, \`add_grade(name, grade)\`, \`get_average(name)\`
- \`class_average()\`: returns the average across all students
- \`top_students(n)\`: returns the top n students by average grade
- \`failing_students(threshold=60)\`: returns students below the threshold
- Load/save state to \`grades.json\``,
    difficulty: "intermediate",
    language: "python",
    estimatedMins: 50,
    objectives: [
      "Design a data model with relationships",
      "Implement statistical computations",
      "Use Python dataclasses and type hints",
      "Write comprehensive tests",
    ],
    starterFiles: {
      "main.py": `import json
import sys
from dataclasses import dataclass, field, asdict
from typing import List, Tuple, Optional

GRADES_FILE = "grades.json"


@dataclass
class Student:
    name: str
    grades: List[float] = field(default_factory=list)


class GradeTracker:
    def __init__(self):
        self.students: List[Student] = []
        self._load()

    def _load(self) -> None:
        """Load from grades.json if it exists."""
        # TODO: implement
        pass

    def _save(self) -> None:
        """Persist all students to grades.json."""
        # TODO: implement
        pass

    def add_student(self, name: str) -> Student:
        """Add a new student. Raise ValueError if name already exists."""
        # TODO: implement
        pass

    def add_grade(self, name: str, grade: float) -> None:
        """Add a grade to a student. Raise ValueError if student not found or grade out of range."""
        # TODO: implement — grades must be 0–100
        pass

    def get_average(self, name: str) -> Optional[float]:
        """Return the average grade for a student, or None if no grades yet."""
        # TODO: implement
        pass

    def class_average(self) -> Optional[float]:
        """Return the average across all students with at least one grade."""
        # TODO: implement
        pass

    def top_students(self, n: int) -> List[Tuple[str, float]]:
        """Return [(name, avg), ...] for the top n students by average."""
        # TODO: implement
        pass

    def failing_students(self, threshold: float = 60.0) -> List[str]:
        """Return names of students whose average is below threshold."""
        # TODO: implement
        pass


def main():
    tracker = GradeTracker()
    args = sys.argv[1:]

    if not args:
        print("Commands: add-student <name> | add-grade <name> <grade> | report")
        return

    command = args[0]

    if command == "add-student":
        student = tracker.add_student(args[1])
        print(f"Added student: {student.name}")

    elif command == "add-grade":
        tracker.add_grade(args[1], float(args[2]))
        avg = tracker.get_average(args[1])
        print(f"Grade added. {args[1]} average: {avg:.1f}")

    elif command == "report":
        avg = tracker.class_average()
        print(f"Class average: {avg:.1f}" if avg else "No grades yet.")
        print("\\nTop students:")
        for name, score in tracker.top_students(5):
            print(f"  {name}: {score:.1f}")
        failing = tracker.failing_students()
        if failing:
            print(f"\\nFailing: {', '.join(failing)}")
`,
      "test_main.py": `import pytest
from main import Student, GradeTracker


@pytest.fixture(autouse=True)
def fresh_tracker(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)


def make_tracker_with_data() -> GradeTracker:
    t = GradeTracker()
    t.add_student("Alice")
    t.add_student("Bob")
    t.add_student("Carol")
    t.add_grade("Alice", 90)
    t.add_grade("Alice", 85)
    t.add_grade("Bob", 55)
    t.add_grade("Bob", 50)
    t.add_grade("Carol", 95)
    return t


def test_add_student():
    t = GradeTracker()
    s = t.add_student("Alice")
    assert s.name == "Alice"
    assert s.grades == []


def test_duplicate_student_raises():
    t = GradeTracker()
    t.add_student("Alice")
    with pytest.raises(ValueError):
        t.add_student("Alice")


def test_add_grade_valid():
    t = GradeTracker()
    t.add_student("Alice")
    t.add_grade("Alice", 85.5)
    assert t.get_average("Alice") == 85.5


def test_add_grade_out_of_range():
    t = GradeTracker()
    t.add_student("Alice")
    with pytest.raises(ValueError):
        t.add_grade("Alice", 110)


def test_add_grade_unknown_student():
    t = GradeTracker()
    with pytest.raises(ValueError):
        t.add_grade("Nobody", 80)


def test_get_average_no_grades():
    t = GradeTracker()
    t.add_student("Alice")
    assert t.get_average("Alice") is None


def test_class_average():
    t = make_tracker_with_data()
    avg = t.class_average()
    assert avg is not None
    assert abs(avg - (87.5 + 52.5 + 95) / 3) < 0.01


def test_top_students():
    t = make_tracker_with_data()
    top = t.top_students(2)
    assert top[0][0] == "Carol"
    assert top[1][0] == "Alice"


def test_failing_students():
    t = make_tracker_with_data()
    failing = t.failing_students(60)
    assert "Bob" in failing
    assert "Alice" not in failing


def test_persistence():
    t = GradeTracker()
    t.add_student("Alice")
    t.add_grade("Alice", 80)
    
    t2 = GradeTracker()
    assert t2.get_average("Alice") == 80
`,
    },
    checks: [
      { id: "syntax",  label: "Python syntax valid",     weight: 10, required: true },
      { id: "tests",   label: "Pytest test suite",        weight: 50 },
      { id: "quality", label: "Code structure & quality", weight: 25 },
      { id: "design",  label: "Statistics & data model",  weight: 15 },
    ],
    grading: {
      installCmd: "pip install pytest --quiet 2>&1",
      buildCmd: "python -m py_compile main.py",
      testCmd: "python -m pytest test_main.py -v --tb=short --no-header 2>&1",
      entryFile: "main.py",
      expectedBehaviourDesc:
        "A GradeTracker that manages students and their grades, computes averages, ranks top students, identifies failing students, and persists data to grades.json.",
      rubric: `Grade this Python Student Grade Tracker:

SCORING CRITERIA:
1. Syntax (10pts): Code compiles without errors
2. Test passage (50pts): Proportional to pytest pass rate
3. Code quality (25pts):
   - Type hints used consistently
   - Error handling with meaningful ValueError messages
   - Clean separation of concerns
   - Input validation (grade 0-100, no duplicate students)
4. Design (15pts):
   - Statistical functions compute correctly
   - Persistence works across instances
   - top_students returns correctly sorted results`,
    },
  },

  // ── 4. Number Base Converter ─────────────────────────────────────────────────
  {
    assignmentId: "base-converter",
    title: "Number Base Converter",
    subtitle: "Implement multi-base number conversion from scratch",
    description: `Build a number base converter **without using Python's built-in \`int(x, base)\` or \`bin()/oct()/hex()\`** functions.

**Requirements:**
- \`to_decimal(number_str, from_base)\`: convert a number string from any base (2–36) to decimal int
- \`from_decimal(decimal_int, to_base)\`: convert a decimal int to a number string in any base (2–36)
- \`convert(number_str, from_base, to_base)\`: convert between any two bases
- Support digits 0–9 and letters A–Z (case-insensitive) for bases > 10
- Raise \`ValueError\` for invalid inputs (invalid digits, out-of-range base, negative numbers)
- A \`main()\` that accepts: \`python main.py <number> <from_base> <to_base>\``,
    difficulty: "intermediate",
    language: "python",
    estimatedMins: 45,
    objectives: [
      "Implement mathematical algorithms from scratch",
      "Handle string manipulation and character encoding",
      "Validate input robustly",
      "Write thorough edge-case tests",
    ],
    starterFiles: {
      "main.py": `import sys

DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def to_decimal(number_str: str, from_base: int) -> int:
    """Convert a number string in from_base to a decimal integer.
    
    Raises ValueError for invalid base (2-36) or invalid digits.
    Do NOT use int(number_str, from_base).
    """
    # TODO: implement
    pass


def from_decimal(decimal_int: int, to_base: int) -> str:
    """Convert a non-negative decimal integer to a string in to_base.
    
    Returns '0' for input 0.
    Raises ValueError for negative input or invalid base.
    Do NOT use bin(), oct(), or hex().
    """
    # TODO: implement
    pass


def convert(number_str: str, from_base: int, to_base: int) -> str:
    """Convert number_str from from_base to to_base."""
    decimal = to_decimal(number_str, from_base)
    return from_decimal(decimal, to_base)


def main():
    if len(sys.argv) != 4:
        print("Usage: python main.py <number> <from_base> <to_base>")
        return

    number_str, from_base_str, to_base_str = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        from_base = int(from_base_str)
        to_base = int(to_base_str)
        result = convert(number_str.upper(), from_base, to_base)
        print(f"{number_str} (base {from_base}) = {result} (base {to_base})")
    except ValueError as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
`,
      "test_main.py": `import pytest
from main import to_decimal, from_decimal, convert


# ── to_decimal tests ──────────────────────────────────────────────────────────

def test_binary_to_decimal():
    assert to_decimal("1010", 2) == 10

def test_hex_to_decimal():
    assert to_decimal("FF", 16) == 255

def test_octal_to_decimal():
    assert to_decimal("17", 8) == 15

def test_base36_to_decimal():
    assert to_decimal("Z", 36) == 35

def test_to_decimal_zero():
    assert to_decimal("0", 10) == 0

def test_to_decimal_invalid_digit():
    with pytest.raises(ValueError):
        to_decimal("2", 2)  # '2' is not valid in base 2

def test_to_decimal_invalid_base_too_low():
    with pytest.raises(ValueError):
        to_decimal("1", 1)

def test_to_decimal_invalid_base_too_high():
    with pytest.raises(ValueError):
        to_decimal("1", 37)


# ── from_decimal tests ────────────────────────────────────────────────────────

def test_decimal_to_binary():
    assert from_decimal(10, 2) == "1010"

def test_decimal_to_hex():
    assert from_decimal(255, 16) == "FF"

def test_decimal_to_octal():
    assert from_decimal(15, 8) == "17"

def test_from_decimal_zero():
    assert from_decimal(0, 2) == "0"

def test_from_decimal_negative():
    with pytest.raises(ValueError):
        from_decimal(-1, 2)


# ── convert tests ─────────────────────────────────────────────────────────────

def test_binary_to_hex():
    assert convert("11111111", 2, 16) == "FF"

def test_hex_to_binary():
    assert convert("FF", 16, 2) == "11111111"

def test_same_base():
    assert convert("42", 10, 10) == "42"
`,
    },
    checks: [
      { id: "syntax",  label: "Python syntax valid",         weight: 10, required: true },
      { id: "tests",   label: "Pytest test suite",            weight: 50 },
      { id: "quality", label: "Code structure & quality",     weight: 25 },
      { id: "design",  label: "Algorithm correctness",        weight: 15 },
    ],
    grading: {
      installCmd: "pip install pytest --quiet 2>&1",
      buildCmd: "python -m py_compile main.py",
      testCmd: "python -m pytest test_main.py -v --tb=short --no-header 2>&1",
      entryFile: "main.py",
      expectedBehaviourDesc:
        "A base converter implementing to_decimal and from_decimal from scratch using DIGITS string and modular arithmetic. No use of int(x, base), bin(), oct(), or hex().",
      rubric: `Grade this Python Number Base Converter:

SCORING CRITERIA:
1. Syntax (10pts): Code compiles without errors
2. Test passage (50pts): Proportional to pytest pass rate
3. Code quality (25pts):
   - Proper use of DIGITS string constant for character lookup
   - Clean loop/algorithm without relying on Python builtins
   - Good error messages in ValueError
   - Handles edge cases (zero, large numbers, base 36)
4. Algorithm (15pts):
   - to_decimal implements positional notation correctly
   - from_decimal uses repeated division correctly
   - Case-insensitive handling
   
Penalize if int(x, base), bin(), oct(), or hex() are used (defeats the purpose).`,
    },
  },

  // ── 5. Linked List (JavaScript) ─────────────────────────────────────────────
  {
    assignmentId: "linked-list-js",
    title: "Linked List",
    subtitle: "Implement a singly linked list from scratch in JavaScript",
    description: `Build a singly linked list in JavaScript without using arrays as the internal store.

**Requirements:**
- A Node class: value, next pointer
- A LinkedList class with: push(value), pop(), prepend(value), delete(value), toArray(), contains(value), and a size getter

**Example usage:**
  const list = new LinkedList()
  list.push(1); list.push(2); list.push(3)
  list.toArray()   // [1, 2, 3]
  list.pop()       // 3
  list.prepend(0)  // list is now [0, 1, 2]
  list.size        // 3`,
    difficulty: "intermediate",
    language: "javascript",
    estimatedMins: 45,
    objectives: [
      "Implement a fundamental data structure from scratch",
      "Understand pointer and reference manipulation in JavaScript",
      "Write modular, testable class-based code",
      "Handle edge cases robustly (empty list, single element, not found)",
    ],
    starterFiles: {
      "linkedList.js": `// ── Node ─────────────────────────────────────────────────────────────────────

class Node {
  constructor(value) {
    this.value = value
    this.next  = null
  }
}

// ── LinkedList ────────────────────────────────────────────────────────────────

class LinkedList {
  constructor() {
    this.head  = null
    this._size = 0
  }

  /** Append a value to the end of the list. */
  push(value) {
    // TODO: implement
  }

  /** Remove and return the last value. Returns undefined if empty. */
  pop() {
    // TODO: implement
  }

  /** Insert a value at the beginning of the list. */
  prepend(value) {
    // TODO: implement
  }

  /** Remove the first node with this value. Returns true if found, false otherwise. */
  delete(value) {
    // TODO: implement
  }

  /** Return all values as a plain array. */
  toArray() {
    // TODO: implement
    return []
  }

  /** Return true if value exists in the list. */
  contains(value) {
    // TODO: implement
    return false
  }

  /** Number of nodes. */
  get size() {
    return this._size
  }
}

module.exports = { Node, LinkedList }
`,
      "linkedList.test.js": `const { LinkedList } = require("./linkedList")

test("toArray empty list", () => {
  expect(new LinkedList().toArray()).toEqual([])
})

test("push single element", () => {
  const l = new LinkedList(); l.push(1)
  expect(l.toArray()).toEqual([1])
})

test("push preserves order", () => {
  const l = new LinkedList(); l.push(1); l.push(2); l.push(3)
  expect(l.toArray()).toEqual([1, 2, 3])
})

test("size empty", () => {
  expect(new LinkedList().size).toBe(0)
})

test("size after pushes", () => {
  const l = new LinkedList(); l.push("a"); l.push("b")
  expect(l.size).toBe(2)
})

test("pop returns last value", () => {
  const l = new LinkedList(); l.push(1); l.push(2); l.push(3)
  expect(l.pop()).toBe(3)
  expect(l.toArray()).toEqual([1, 2])
})

test("pop single element", () => {
  const l = new LinkedList(); l.push(42)
  expect(l.pop()).toBe(42)
  expect(l.size).toBe(0)
})

test("pop empty returns undefined", () => {
  expect(new LinkedList().pop()).toBeUndefined()
})

test("prepend inserts at front", () => {
  const l = new LinkedList(); l.push(2); l.push(3); l.prepend(1)
  expect(l.toArray()).toEqual([1, 2, 3])
})

test("prepend empty list", () => {
  const l = new LinkedList(); l.prepend(7)
  expect(l.toArray()).toEqual([7]); expect(l.size).toBe(1)
})

test("delete middle element", () => {
  const l = new LinkedList(); l.push(1); l.push(2); l.push(3)
  expect(l.delete(2)).toBe(true)
  expect(l.toArray()).toEqual([1, 3])
})

test("delete head", () => {
  const l = new LinkedList(); l.push(1); l.push(2)
  l.delete(1)
  expect(l.toArray()).toEqual([2])
})

test("delete missing value returns false", () => {
  const l = new LinkedList(); l.push(1)
  expect(l.delete(99)).toBe(false)
  expect(l.size).toBe(1)
})

test("contains true", () => {
  const l = new LinkedList(); l.push(5); l.push(10)
  expect(l.contains(10)).toBe(true)
})

test("contains false", () => {
  const l = new LinkedList(); l.push(1)
  expect(l.contains(99)).toBe(false)
})
`,
      "package.json": `{
  "name": "linked-list",
  "version": "1.0.0",
  "scripts": { "test": "jest" },
  "devDependencies": { "jest": "^29.0.0" }
}
`,
      "README.md": `# Linked List (JavaScript)

## Run tests
  npm install
  npm test
`,
    },
    checks: [
      { id: "syntax",  label: "Node.js syntax valid",    weight: 10, required: true },
      { id: "tests",   label: "Jest test suite",          weight: 50 },
      { id: "quality", label: "Code structure & quality", weight: 25 },
      { id: "design",  label: "Algorithm & edge cases",   weight: 15 },
    ],
    grading: {
      installCmd: "npm install 2>&1",
      buildCmd:   "node -e \"require('./linkedList')\"",
      testCmd:    "npx jest --no-coverage --forceExit 2>&1",
      entryFile:  "linkedList.js",
      expectedBehaviourDesc:
        "A LinkedList class backed by Node objects. push appends, pop removes tail, prepend inserts at head, delete removes first match, toArray converts to array, contains checks membership. size stays accurate.",
      rubric: `Grade this JavaScript Linked List:

SCORING CRITERIA:
1. Syntax (10pts): module loads without errors
2. Jest tests (50pts): proportional to pass rate
3. Code quality (25pts):
   - Uses Node class correctly with value and next
   - _size counter stays in sync on all operations
   - No redundant traversals where avoidable
   - Readable, well-structured code
4. Algorithm & edge cases (15pts):
   - Empty list handled (pop returns undefined, delete returns false)
   - Single-element cases work correctly
   - delete removes only first occurrence
   - toArray does not mutate the list

Penalize if a plain array is used as the internal data store.`,
    },
  },

]

// ─── Lookup helper ────────────────────────────────────────────────────────────
export function getAssignment(id: string): SoSEAssignment | undefined {
  return SOSE_ASSIGNMENTS.find((a) => a.assignmentId === id)
}
