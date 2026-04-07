"use client"

import { useRef, useState } from "react"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { gemmaJSON } from "@/lib/novita"

type Props = {
  studentId: string
  moduleId: string
  questionId: string
  rubric: string
  prompt: string
  faculty: "medicine" | "arts"
  onGraded: (result: { score: number; feedback: string; downloadURL: string }) => void
}

export function ImageUploadAssessor({ studentId, moduleId, questionId, rubric, prompt, faculty, onGraded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [status, setStatus] = useState<"idle" | "uploading" | "grading" | "done" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const facultyMeta = {
    medicine: { label: "Clinical Image", hint: "Upload an X-ray, MRI, histology slide, or anatomy diagram", accept: "image/jpeg,image/png,image/webp", color: "var(--faculty-medicine)" },
    arts: { label: "Artwork Submission", hint: "Upload your sketch, painting, design, or digital artwork", accept: "image/jpeg,image/png,image/webp,image/gif", color: "var(--faculty-arts)" },
  }
  const meta = facultyMeta[faculty]

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setStatus("idle")
    setError(null)
  }

  async function handleSubmit() {
    if (!file) return
    setStatus("uploading")
    setError(null)

    try {
      // ── 1. Upload to Firebase Storage ─────────────────────────────────────
      const storagePath = `assessments/${studentId}/${moduleId}/${questionId}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, storagePath)
      const uploadTask = uploadBytesResumable(storageRef, file)

      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            setUploadProgress(Math.round(progress))
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref)
            resolve(url)
          }
        )
      })

      setStatus("grading")

      // ── 2. Convert image to base64 for Gemma 4 VLM ───────────────────────
      const base64 = await fileToBase64(file)
      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp"

      // ── 3. Call Novita multimodal endpoint ────────────────────────────────
      const gradingResult = await gradeImageWithVLM({
        base64,
        mimeType,
        prompt,
        rubric,
        faculty,
      })

      onGraded({ ...gradingResult, downloadURL })
      setStatus("done")
    } catch (err) {
      console.error(err)
      setError("Upload or grading failed. Please try again.")
      setStatus("error")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const dropped = e.dataTransfer.files?.[0]
          if (dropped) {
            setFile(dropped)
            setPreview(URL.createObjectURL(dropped))
            setStatus("idle")
          }
        }}
        style={{
          border: `2px dashed ${preview ? meta.color : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "2rem",
          textAlign: "center",
          cursor: "pointer",
          background: preview ? `${meta.color}08` : "var(--bg-elevated)",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          minHeight: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Preview"
            style={{ maxHeight: "300px", maxWidth: "100%", objectFit: "contain", borderRadius: "8px" }}
          />
        ) : (
          <>
            <div style={{ fontSize: "2.5rem" }}>{faculty === "arts" ? "🎨" : "🩺"}</div>
            <div>
              <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{meta.label}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{meta.hint}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "DM Mono, monospace" }}>
                Click to upload or drag & drop
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={meta.accept}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Progress */}
      {status === "uploading" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>Uploading...</span>
            <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontFamily: "DM Mono, monospace" }}>{uploadProgress}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--bg-elevated)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${uploadProgress}%`,
                background: meta.color,
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {status === "grading" && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontFamily: "DM Mono, monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          Gemma 4 vision is analysing your {faculty === "arts" ? "artwork" : "clinical image"}...
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            background: "rgba(249,168,212,0.08)",
            border: "1px solid var(--faculty-medicine)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.875rem",
            color: "var(--faculty-medicine)",
          }}
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        {preview && status === "idle" && (
          <button
            className="btn-ghost"
            onClick={() => { setPreview(null); setFile(null) }}
            style={{ fontSize: "0.875rem", padding: "0.6rem 1.25rem" }}
          >
            Remove
          </button>
        )}
        <button
          className="btn-primary"
          disabled={!file || status === "uploading" || status === "grading" || status === "done"}
          onClick={handleSubmit}
          style={{
            flex: 1,
            opacity: !file || ["uploading", "grading", "done"].includes(status) ? 0.4 : 1,
            fontSize: "0.9rem",
          }}
        >
          {status === "done" ? "✓ Graded" : `Submit ${meta.label} →`}
        </button>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (data:image/jpeg;base64,)
      resolve(result.split(",")[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function gradeImageWithVLM({
  base64,
  mimeType,
  prompt,
  rubric,
  faculty,
}: {
  base64: string
  mimeType: string
  prompt: string
  rubric: string
  faculty: "medicine" | "arts"
}): Promise<{ score: number; feedback: string }> {
  const systemPrompt = faculty === "medicine"
    ? `You are Athena's medical assessor. You have expert-level knowledge in clinical imaging, anatomy, and diagnostic medicine. Evaluate the submitted clinical image against the assessment criteria.`
    : `You are Athena's arts assessor. You have expert knowledge in visual art, design principles, composition, colour theory, and creative technique. Evaluate the submitted artwork against the assessment criteria.`

  const userPrompt = `Assessment Question: ${prompt}

Grading Rubric: ${rubric}

Please evaluate the submitted image and provide a score and detailed feedback.

Return ONLY valid JSON (no markdown):
{
  "score": <0-100>,
  "feedback": "Detailed, constructive feedback covering: what was done well, specific areas for improvement, and how the work relates to the learning objectives",
  "observations": ["specific observation 1", "specific observation 2", "specific observation 3"]
}`

  // Call Novita with multimodal message
  const response = await fetch("/api/assess/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64, mimeType, systemPrompt, userPrompt }),
  })

  if (!response.ok) throw new Error("VLM grading failed")
  return response.json()
}
