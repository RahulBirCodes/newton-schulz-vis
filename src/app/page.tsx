"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type Matrix = number[][]

const DEFAULT_MATRIX: Matrix = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const DEGREE_CHOICES = [3, 5] as const

export default function Home() {
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(DEFAULT_MATRIX))
  const [degree, setDegree] = useState<typeof DEGREE_CHOICES[number]>(3)
  const [iterations, setIterations] = useState(6)
  const [normalize, setNormalize] = useState(false)
  const coefficientCount = useMemo(() => (degree + 1) / 2, [degree])
  const coefficientGridClass = coefficientCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
  const [coefficients, setCoefficients] = useState<number[]>(() => Array((3 + 1) / 2).fill(1))

  const handleMatrixChange = (row: number, column: number, value: string) => {
    const numericValue = Number(value)
    setMatrix((previous) => {
      const next = previous.map((r) => [...r])
      next[row][column] = Number.isFinite(numericValue) ? numericValue : 0
      return next
    })
  }

  const handleDegreeChange = (nextDegree: (typeof DEGREE_CHOICES)[number]) => {
    setDegree(nextDegree)
    const nextCount = (nextDegree + 1) / 2
    setCoefficients((previous) => {
      const next = Array(nextCount).fill(1)
      return next.map((_, index) => previous[index] ?? 1)
    })
  }

  const handleCoefficientChange = (index: number, value: string) => {
    const numericValue = Number(value)
    setCoefficients((previous) => {
      const next = [...previous]
      next[index] = Number.isFinite(numericValue) ? numericValue : 0
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-white py-12 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Newton–Schulz Inputs
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Iteration setup
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500">
            Mirror the clean control stack from the SVD tool: define your 3×3 matrix, select an odd-degree
            polynomial, and lock in the iteration count. Nothing runs automatically; this page simply
            captures the numbers with a tidy layout.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-zinc-200/80 shadow-sm">
            <CardHeader>
            <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
              Matrix (3×3)
            </CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Enter each value; use decimals if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {matrix.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-3 gap-2">
                    {row.map((value, columnIndex) => (
                      <Input
                        key={`${rowIndex}-${columnIndex}`}
                        step="0.01"
                        value={value}
                        onChange={(event) => handleMatrixChange(rowIndex, columnIndex, event.target.value)}
                        className="h-11 rounded-xl border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
                Polynomial
              </CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Pick degree 3 or 5 and plug in the coefficients in a compact grid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-3">
                {DEGREE_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleDegreeChange(choice)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      degree === choice
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    Degree {choice}
                  </button>
                ))}
              </div>

              <div className={`grid gap-3 ${coefficientGridClass}`}>
                {Array.from({ length: coefficientCount }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm font-medium text-zinc-500">
                      c{index}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={coefficients[index] ?? 0}
                      onChange={(event) => handleCoefficientChange(index, event.target.value)}
                      className="h-11 rounded-lg border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
              Iteration settings
            </CardTitle>
            <CardDescription className="text-sm text-zinc-500">
              Choose how many steps and optionally flag whether you plan to normalize first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium text-zinc-500">Steps</Label>
                <Input
                  type="number"
                  min={0}
                  value={iterations}
                  onChange={(event) => setIterations(Number(event.target.value) || 0)}
                  className="h-11 rounded-lg border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-900 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-1 items-center justify-between rounded-xl border border-zinc-200 bg-white/80 p-4">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-zinc-900">Normalize by Frobenius norm</p>
                  <p className="text-xs text-zinc-500">
                    Toggle whether the initial matrix would be divided by ‖X‖<sub>F</sub>.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={normalize}
                  onClick={() => setNormalize((previous) => !previous)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    normalize ? "bg-blue-500" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      normalize ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row])
}
