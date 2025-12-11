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

export function matClone(A: Matrix): Matrix {
  return A.map(row => [...row]);
}

export function identity3(): Matrix {
  return [
    [1,0,0],
    [0,1,0],
    [0,0,1],
  ];
}

export function matTranspose(A: Matrix): Matrix {
  return [
    [A[0][0], A[1][0], A[2][0]],
    [A[0][1], A[1][1], A[2][1]],
    [A[0][2], A[1][2], A[2][2]],
  ];
}

export function matAdd(A: Matrix, B: Matrix): Matrix {
  const C: Matrix = [
    [0,0,0],
    [0,0,0],
    [0,0,0],
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      C[i][j] = A[i][j] + B[i][j];
    }
  }
  return C;
}

export function matScale(A: Matrix, s: number): Matrix {
  const C: Matrix = [
    [0,0,0],
    [0,0,0],
    [0,0,0],
  ];

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 0 + 3; j++) {
      C[i][j] = A[i][j] * s;
    }
  }
  return C;
}

export function matMul(A: Matrix, B: Matrix): Matrix {
  const C: Matrix = [
    [0,0,0],
    [0,0,0],
    [0,0,0],
  ];

  for (let i = 0; i < 3; i++) {      // rows of A
    for (let j = 0; j < 3; j++) {    // columns of B
      C[i][j] =
        A[i][0] * B[0][j] +
        A[i][1] * B[1][j] +
        A[i][2] * B[2][j];
    }
  }

  return C;
}

export function frobeniusNorm(A: Matrix): number {
  let sum = 0;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      sum += A[i][j] * A[i][j];
  return Math.sqrt(sum);
}

export function XXt(X: Matrix): Matrix {
  return matMul(X, matTranspose(X));
}

export function create_polynomial(degree: 3 | 5, coeffs: number[]) {
  // coeffs = [a0, a1] for degree 3
  // coeffs = [a0, a1, a2] for degree 5

  return function applyPolynomial(X: Matrix): Matrix {
    const G = XXt(X);       // XXᵀ
    const GX = matMul(G, X); // (XXᵀ)X

    if (degree === 3) {
      const a0 = coeffs[0];
      const a1 = coeffs[1];

      // p(X) = a0 X + a1 (XXᵀ)X
      const term0 = matScale(X,  a0);
      const term1 = matScale(GX, a1);

      return matAdd(term0, term1);
    }

    if (degree === 5) {
      const a0 = coeffs[0];
      const a1 = coeffs[1];
      const a2 = coeffs[2];

      // compute (XXᵀ)^2 X
      const G2X = matMul(G, GX); // (XXᵀ)(XXᵀ X) = (XXᵀ)² X

      // p(X) = a0 X + a1 (XXᵀ)X + a2 (XXᵀ)²X
      const term0 = matScale(X,   a0);
      const term1 = matScale(GX,  a1);
      const term2 = matScale(G2X, a2);

      return matAdd(matAdd(term0, term1), term2);
    }

    throw new Error("lock in") 
  };
}

const DEGREE_CHOICES = [3, 5] as const
const DEGREE_DEFAULTS: Record<(typeof DEGREE_CHOICES)[number], number[]> = {
  3: [3/2, -1/2],
  5: [3.4445, -4.775, 2.0315],
}

export default function Home() {
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(DEFAULT_MATRIX))
  const [degree, setDegree] = useState<typeof DEGREE_CHOICES[number]>(3)
  const [iterations, setIterations] = useState(6)
  const [normalize, setNormalize] = useState(false)
  const coefficientCount = useMemo(() => (degree + 1) / 2, [degree])
  const coefficientGridClass = coefficientCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
  const [coefficients, setCoefficients] = useState<number[]>(() => [...DEGREE_DEFAULTS[3]])
  const [defaultText, setDefaultText] = useState(() => DEGREE_DEFAULTS[3].join(", "))

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
    const defaults = DEGREE_DEFAULTS[nextDegree] ?? Array(nextCount).fill(1)
    setCoefficients(defaults.slice(0, nextCount))
    setDefaultText(defaults.join(", "))
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

function parseDefaultText(text: string, count: number) {
  const entries = text
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((_, index) => index < count)
  while (entries.length < count) {
    entries.push(1)
  }
  return entries.map((value) => (Number.isFinite(value) ? value : 0))
}
