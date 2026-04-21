/**
 * Detect the programming language of a code snippet.
 * Returns one of the 12 keys supported by the Judge0 LANGUAGE_IDS map:
 *   python | javascript | typescript | java | cpp | c | rust | go | ruby | kotlin | swift | r
 *
 * Rules are ordered from most-specific to least-specific so that a more
 * definitive signal overrides a weaker one (e.g. Kotlin is checked before Java
 * because both use `class`; Rust before C/C++ because `fn` is uncommon elsewhere).
 */
export function detectLanguage(code: string): string {
  if (!code || !code.trim()) return "python"

  // ── Rust ────────────────────────────────────────────────────────────────────
  if (
    /\bfn\s+main\s*\(/.test(code) ||
    /\buse\s+std::/.test(code) ||
    /\blet\s+mut\s+/.test(code) ||
    /\bimpl\s+\w/.test(code) ||
    /\bprintln!\s*\(/.test(code) ||
    /\bvec!\s*\[/.test(code) ||
    /\b->\s*(i32|u32|i64|u64|usize|String|bool|f64|f32)\b/.test(code)
  ) return "rust"

  // ── Kotlin ──────────────────────────────────────────────────────────────────
  if (
    /\bfun\s+main\s*\(/.test(code) ||
    /\bval\s+\w+\s*[:=]/.test(code) ||
    /\bvar\s+\w+\s*[:=]/.test(code) ||
    /\bprintln\s*\(/.test(code) ||
    /\bdata\s+class\s+/.test(code) ||
    /\bobject\s+\w+/.test(code) ||
    /\bwhen\s*\(/.test(code)
  ) return "kotlin"

  // ── Swift ───────────────────────────────────────────────────────────────────
  if (
    /\bvar\s+\w+\s*:\s*\w+/.test(code) ||
    /\blet\s+\w+\s*:\s*\w+/.test(code) ||
    /\bprint\s*\(/.test(code) && /\bvar\s+\w/.test(code) ||
    /\bfunc\s+\w+\s*\(/.test(code) ||
    /\bguard\s+let\b/.test(code) ||
    /\bif\s+let\b/.test(code) && /\bOptional\b/.test(code) ||
    /\bStruct\s+\w+/.test(code) ||
    /\bimport\s+Foundation\b/.test(code) ||
    /\bimport\s+UIKit\b/.test(code)
  ) return "swift"

  // ── Java ────────────────────────────────────────────────────────────────────
  if (
    /\bpublic\s+class\s+\w+/.test(code) ||
    /\bSystem\.out\.print/.test(code) ||
    /\bpublic\s+static\s+void\s+main/.test(code) ||
    /\bimport\s+java\./.test(code) ||
    /\bnew\s+\w+\s*\(/.test(code) && /\bclass\s+/.test(code)
  ) return "java"

  // ── C++ ─────────────────────────────────────────────────────────────────────
  if (
    /#include\s*<(iostream|vector|string|algorithm|map|set|queue|stack)>/.test(code) ||
    /\bstd::(cout|cin|endl|vector|string|map|set)\b/.test(code) ||
    /\bcout\s*<</.test(code) ||
    /\busing\s+namespace\s+std\s*;/.test(code) ||
    /\btemplate\s*</.test(code) ||
    /\bclass\s+\w+\s*\{/.test(code) && /#include/.test(code)
  ) return "cpp"

  // ── C ───────────────────────────────────────────────────────────────────────
  if (
    /#include\s*<(stdio\.h|stdlib\.h|string\.h|math\.h)>/.test(code) ||
    /\bprintf\s*\(/.test(code) ||
    /\bscanf\s*\(/.test(code) ||
    /\bint\s+main\s*\(\s*(void|int\s+argc)/.test(code) ||
    /\bmalloc\s*\(/.test(code) ||
    /\bfree\s*\(/.test(code)
  ) return "c"

  // ── Go ──────────────────────────────────────────────────────────────────────
  if (
    /\bpackage\s+main\b/.test(code) ||
    /\bfunc\s+main\s*\(\s*\)/.test(code) ||
    /\bfmt\.Print/.test(code) ||
    /\bimport\s+"fmt"/.test(code) ||
    /\bfunc\s+\w+\s*\([^)]*\)\s+\w/.test(code) && /\bpackage\b/.test(code) ||
    /:=/.test(code) && /\bfunc\b/.test(code) && /\bpackage\b/.test(code)
  ) return "go"

  // ── R ───────────────────────────────────────────────────────────────────────
  if (
    /\bc\s*\(/.test(code) && /\bprint\s*\(/.test(code) && /<-/.test(code) ||
    /<-\s*(c|data\.frame|matrix|list|vector)\s*\(/.test(code) ||
    /\blibrary\s*\(/.test(code) ||
    /\bggplot\s*\(/.test(code) ||
    /\bggplot2\b/.test(code) ||
    /\bdplyr\b/.test(code) ||
    /\bdata\.frame\s*\(/.test(code) ||
    /\b(mean|median|sd|var|lm|summary)\s*\(/.test(code) && /<-/.test(code)
  ) return "r"

  // ── Ruby ────────────────────────────────────────────────────────────────────
  if (
    /\bputs\s+/.test(code) ||
    /\bend\b/.test(code) && /\bdef\s+\w/.test(code) ||
    /\bdo\s*\|/.test(code) ||
    /\.each\s*\{/.test(code) ||
    /\battr_accessor\b/.test(code) ||
    /\brequire\s+'/.test(code) ||
    /\bnil\b/.test(code) && /\bdef\b/.test(code)
  ) return "ruby"

  // ── TypeScript ──────────────────────────────────────────────────────────────
  if (
    /:\s*(string|number|boolean|any|void|never|unknown|null|undefined)\b/.test(code) ||
    /\binterface\s+\w+/.test(code) ||
    /\btype\s+\w+\s*=/.test(code) ||
    /\benum\s+\w+/.test(code) ||
    /<[A-Z]\w*>/.test(code) && /\bconst\b/.test(code) ||
    /as\s+\w+/.test(code) && /\bconst\b/.test(code)
  ) return "typescript"

  // ── JavaScript ──────────────────────────────────────────────────────────────
  if (
    /\bfunction\s+\w+\s*\(/.test(code) ||
    /\bconst\s+\w+\s*=/.test(code) ||
    /\blet\s+\w+\s*=/.test(code) ||
    /\bconsole\.(log|error|warn)\s*\(/.test(code) ||
    /\bnew\s+Promise\s*\(/.test(code) ||
    /\basync\s+function\b/.test(code) ||
    /=>\s*\{/.test(code)
  ) return "javascript"

  // ── Python (default + explicit signals) ─────────────────────────────────────
  return "python"
}
