"use client"

import { useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { python } from "@codemirror/lang-python"
import { javascript } from "@codemirror/lang-javascript"
import { rust } from "@codemirror/lang-rust"
import { java } from "@codemirror/lang-java"
import { cpp } from "@codemirror/lang-cpp"
import { StreamLanguage } from "@codemirror/language"
import { go } from "@codemirror/legacy-modes/mode/go"
import { ruby } from "@codemirror/legacy-modes/mode/ruby"
import { kotlin } from "@codemirror/legacy-modes/mode/clike"
import { swift } from "@codemirror/legacy-modes/mode/swift"
import { r } from "@codemirror/legacy-modes/mode/r"
import { EditorView } from "@codemirror/view"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags as t } from "@lezer/highlight"

// ─── Athena syntax colour palette ────────────────────────────────────────────
const athenaHighlight = HighlightStyle.define([
  { tag: t.comment,                   color: "#6a737d", fontStyle: "italic" },
  { tag: t.lineComment,               color: "#6a737d", fontStyle: "italic" },
  { tag: t.blockComment,              color: "#6a737d", fontStyle: "italic" },
  { tag: t.string,                    color: "#98c379" },
  { tag: t.special(t.string),         color: "#98c379" },
  { tag: t.regexp,                    color: "#98c379" },
  { tag: t.keyword,                   color: "#c678dd" },
  { tag: t.controlKeyword,            color: "#c678dd" },
  { tag: t.moduleKeyword,             color: "#c678dd" },
  { tag: t.operatorKeyword,           color: "#c678dd" },
  { tag: t.number,                    color: "#d19a66" },
  { tag: t.bool,                      color: "#d19a66" },
  { tag: t.null,                      color: "#d19a66" },
  { tag: t.atom,                      color: "#d19a66" },
  { tag: t.function(t.variableName),  color: "#61afef" },
  { tag: t.function(t.propertyName),  color: "#61afef" },
  { tag: t.definition(t.variableName),color: "#61afef" },
  { tag: t.className,                 color: "#e5c07b" },
  { tag: t.definition(t.typeName),    color: "#e5c07b" },
  { tag: t.typeName,                  color: "#e5c07b" },
  { tag: t.self,                      color: "#e06c75" },
  { tag: t.propertyName,              color: "#e06c75" },
  { tag: t.operator,                  color: "#56b6c2" },
  { tag: t.punctuation,               color: "#a0aec0" },
  { tag: t.meta,                      color: "#61afef" },
  { tag: t.attributeName,             color: "#e06c75" },
  { tag: t.attributeValue,            color: "#98c379" },
  { tag: t.variableName,              color: "#a0aec0" },
])

// ─── Structural dark theme matching Athena's palette ─────────────────────────
const athenaEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0d0d16",
      color: "#a0aec0",
      fontFamily: "'DM Mono', 'Courier New', monospace",
    },
    ".cm-content": {
      caretColor: "#6ee7b7",
      padding: "0.75rem 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#6ee7b7",
      borderLeftWidth: "2px",
    },
    "&.cm-focused": {
      outline: "none",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(110,231,183,0.18)",
    },
    ".cm-gutters": {
      backgroundColor: "#0a0a14",
      color: "#4a4a5a",
      border: "none",
      borderRight: "1px solid rgba(255,255,255,0.04)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 0.75rem 0 0.5rem",
      minWidth: "2.5rem",
      fontSize: "0.78rem",
      userSelect: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255,255,255,0.025)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255,255,255,0.025)",
      color: "#6a737d",
    },
    ".cm-line": {
      padding: "0 0.875rem 0 0",
    },
    ".cm-scroller": {
      fontFamily: "'DM Mono', 'Courier New', monospace",
      lineHeight: "1.7",
      fontSize: "0.875rem",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(110,231,183,0.15)",
      outline: "1px solid rgba(110,231,183,0.35)",
      borderRadius: "2px",
    },
    ".cm-tooltip": {
      backgroundColor: "#161625",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "4px",
    },
  },
  { dark: true }
)

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  value: string
  onChange?: (val: string) => void
  language?: "python" | "javascript" | "typescript" | "java" | "cpp" | "c" | "rust" | "go" | "ruby" | "kotlin" | "swift" | "r" | "text"
  readOnly?: boolean
  minHeight?: string
}

export function ProgrammingEditor({
  value,
  onChange,
  language = "python",
  readOnly = false,
  minHeight = "220px",
}: Props) {
  const langExtension = useMemo(() => {
    switch (language) {
      case "javascript":  return javascript()
      case "typescript":  return javascript({ typescript: true })
      case "rust":        return rust()
      case "java":        return java()
      case "cpp":
      case "c":           return cpp()
      case "go":          return StreamLanguage.define(go)
      case "ruby":        return StreamLanguage.define(ruby)
      case "kotlin":      return StreamLanguage.define(kotlin)
      case "swift":       return StreamLanguage.define(swift)
      case "r":           return StreamLanguage.define(r)
      case "python":
      default:            return python()
    }
  }, [language])

  const extensions = useMemo(() => [
    langExtension,
    athenaEditorTheme,
    syntaxHighlighting(athenaHighlight),
    EditorView.lineWrapping,
  ], [langExtension])

  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      readOnly={readOnly}
      onChange={onChange}
      theme="none"
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        bracketMatching: true,
        closeBrackets: !readOnly,
        autocompletion: false,
        indentOnInput: true,
        tabSize: 4,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        drawSelection: true,
        syntaxHighlighting: false,
      }}
      style={{ minHeight, overflow: "hidden" }}
    />
  )
}
