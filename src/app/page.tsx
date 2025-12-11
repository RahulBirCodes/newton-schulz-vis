"use client"

import { useMemo, useRef, useState } from "react"
import { SVD } from "svd-js"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Line, Html } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
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
  3: [3 / 2, -1 / 2],
  5: [3.4445, -4.775, 2.0315],
}


interface TrajectoryPoint {
  step: number
  vector: [number, number, number]
  scaled: [number, number, number]
}
interface Snapshot {
  step: number
  matrix: Matrix
  singularValues: number[]
  hasNaN: boolean
}

export default function Home() {
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(DEFAULT_MATRIX))
  const [degree, setDegree] = useState<typeof DEGREE_CHOICES[number]>(3)
  const [iterations, setIterations] = useState(6)
  const [normalize, setNormalize] = useState(true)
  const coefficientCount = useMemo(() => (degree + 1) / 2, [degree])
  const coefficientGridClass = coefficientCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
  const [coefficients, setCoefficients] = useState<number[]>(() => [...DEGREE_DEFAULTS[3]])
  const polynomialFn = useMemo(
    () => create_polynomial(degree, coefficients),
    [degree, coefficients]
  )
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [selectedStep, setSelectedStep] = useState(0)
  const [nanStep, setNanStep] = useState<number | null>(null)
  const [isRunning, setIsRunning] = useState(false)

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
    const trimmed = defaults.slice(0, nextCount)
    setCoefficients(trimmed)
  }

  const handleCoefficientChange = (index: number, value: string) => {
    const numericValue = Number(value)
    setCoefficients((previous) => {
      const next = [...previous]
      next[index] = Number.isFinite(numericValue) ? numericValue : 0
      return next
    })
  }

  const handleRunIterations = () => {
    if (!polynomialFn) return
    setIsRunning(true)
    try {
      let current = cloneMatrix(matrix)
      if (normalize) {
        const norm = frobeniusNorm(current)
        if (Number.isFinite(norm) && norm > 0) {
          current = matScale(current, 1 / norm)
        }
      }

      const results: Snapshot[] = []
      const recordSnapshot = (input: Matrix, step: number) => {
        const invalidValues = matrixHasNaN(input)
        let hasNaN = invalidValues
        let singularValues: number[] = [NaN, NaN, NaN]
        if (!invalidValues) {
          try {
            const { q } = SVD(input)
            singularValues = [...q].slice(0, 3)
          } catch {
            hasNaN = true
          }
        }
        results.push({
          step,
          matrix: cloneMatrix(input),
          singularValues,
          hasNaN,
        })
        return hasNaN
      }

      let stop = recordSnapshot(current, 0)
      for (let step = 1; step <= iterations; step += 1) {
        if (stop) break
        current = polynomialFn(current)
        stop = recordSnapshot(current, step)
      }

      const firstNaN = results.find((snapshot) => snapshot.hasNaN)?.step ?? null
      setSnapshots(results)
      setSelectedStep(0)
      setNanStep(firstNaN)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-white py-12 text-zinc-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
            Rahul Bir - eecs182
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Newton-Schulz Muon Iteration Visualization
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-500">
            Visualize how the singular values of a 3x3 evolve as you apply an odd polynomial to it.
            Try with different coefficients and see the trajectory of the singular values on a 3d plot!
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
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                className="rounded-lg px-6 text-sm font-semibold"
                onClick={handleRunIterations}
                disabled={isRunning}
              >
                {isRunning ? "Running…" : "Start iteration"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {snapshots.length > 0 && (
          <Card className="border border-zinc-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
                Iteration timeline
              </CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Scrub through steps to inspect the captured matrices and singular values.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-500">
                  <span>Step {selectedStep}</span>
                  <span>of {snapshots.length - 1}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={snapshots.length - 1}
                  value={selectedStep}
                  onChange={(event) => setSelectedStep(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              {nanStep !== null && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Numerical instability detected at step {nanStep}. Iteration stopped afterwards.
                </div>
              )}
              {snapshots[selectedStep]?.hasNaN ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
                  Matrix entries became NaN at this step. No further data is available.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <MatrixReadout matrix={snapshots[selectedStep].matrix} />
                  <SingularValueDisplay values={snapshots[selectedStep].singularValues} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {snapshots.length > 0 && (
          <Card className="border border-zinc-200/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
                Singular value path
              </CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Explore how (σ₁, σ₂, σ₃) evolve across iterations in 3D space. Drag to orbit, scroll to zoom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SingularValuePath3D snapshots={snapshots} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row])
}

function matrixHasNaN(matrix: Matrix) {
  return matrix.some((row) => row.some((value) => !Number.isFinite(value)))
}

function MatrixReadout({ matrix }: { matrix: Matrix }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-500">Matrix</p>
      <div className="space-y-2">
        {matrix.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-3 gap-2">
            {row.map((value, columnIndex) => (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-sm"
              >
                {formatNumber(value)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SingularValueDisplay({ values }: { values: number[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-500">Singular values</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {values.map((value, index) => (
          <div
            key={index}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-sm"
          >
            σ{index + 1}: {formatNumber(value)}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "NaN"
  return Number(value).toFixed(4)
}

function SingularValuePath3D({ snapshots }: { snapshots: Snapshot[] }) {
  const [expanded, setExpanded] = useState(false)
  const primaryControlsRef = useRef<OrbitControlsImpl | null>(null)
  const modalControlsRef = useRef<OrbitControlsImpl | null>(null)

  const filteredPoints = useMemo(() => {
    return snapshots
      .filter((snapshot) => snapshot.singularValues.every((value) => Number.isFinite(value)))
      .map((snapshot) => ({
        step: snapshot.step,
        vector: snapshot.singularValues as [number, number, number],
      }))
  }, [snapshots])

  const { scaledPoints, targetScaled } = useMemo(() => {
    if (filteredPoints.length === 0) {
      return {
        scaledPoints: [] as TrajectoryPoint[],
        targetScaled: [0, 0, 0] as [number, number, number],
      }
    }
    const maxComponent = Math.max(
      1,
      ...filteredPoints.flatMap((point) => point.vector.map((value) => Math.abs(value)))
    )
    const derivedScale = 1.5 / maxComponent
    const scaled = filteredPoints.map((point) => ({
      ...point,
      scaled: point.vector.map((value) => value * derivedScale) as [number, number, number],
    }))
    const target = [1, 1, 1].map((value) => value * derivedScale) as [number, number, number]
    return { scaledPoints: scaled, targetScaled: target }
  }, [filteredPoints])

  if (scaledPoints.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Not enough valid singular values to display a trajectory.
      </p>
    )
  }

  const cameraPosition: [number, number, number] = [2.7, 2.4, 3.1]
  const cameraTarget: [number, number, number] = [0, 0, 0]

  return (
    <>
      <div className="relative h-[600px] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
          <button
            type="button"
            className="pointer-events-auto rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 shadow-sm transition hover:text-zinc-900"
            onClick={() => setExpanded(true)}
          >
            Expand
          </button>
        </div>
        <Canvas camera={{ position: cameraPosition, fov: 45 }}>
          <SingularValueScene
            controlsRef={primaryControlsRef}
            points={scaledPoints}
            target={targetScaled}
            lookTarget={cameraTarget}
            enablePan
          />
        </Canvas>
      </div>
      <div className="mt-4 flex flex-wrap gap-6 text-sm font-medium text-zinc-600">
        <LegendPill color="#0ea5e9" label="Trajectory point" />
        <LegendPill color="#f97316" label="Final step" />
        <LegendPill color="#22c55e" label="Target (1,1,1)" />
      </div>
      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <Card className="w-full max-w-5xl border border-zinc-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-zinc-900 tracking-tight">
                  Singular value path
                </CardTitle>
                <CardDescription className="text-sm text-zinc-500">
                  Expanded view
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setExpanded(false)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[620px] rounded-3xl border border-zinc-200 bg-zinc-50">
                <Canvas camera={{ position: cameraPosition, fov: 38 }}>
                  <SingularValueScene
                    controlsRef={modalControlsRef}
                    points={scaledPoints}
                    target={targetScaled}
                    lookTarget={cameraTarget}
                    enablePan
                  />
                </Canvas>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}


function SingularValueScene({
  controlsRef,
  points,
  target,
  lookTarget,
  enablePan = false,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
  points: TrajectoryPoint[]
  target: [number, number, number]
  lookTarget: [number, number, number]
  enablePan?: boolean
}) {
  return (
    <>
      <color attach="background" args={["#f8fafc"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 3]} intensity={0.6} />
      <gridHelper args={[10, 20, "#cbd5f5", "#e5e7eb"]} position={[0, -0.01, 0]} />
      <Line points={points.map((point) => point.scaled)} color="#2563eb" lineWidth={8} />
      {points.map((point) => (
        <mesh key={point.step} position={point.scaled}>
          <sphereGeometry args={[point.step === points.length - 1 ? 0.12 : 0.1, 32, 32]} />
          <meshStandardMaterial
            color={point.step === points.length - 1 ? "#f97316" : "#0ea5e9"}
            emissive={point.step === points.length - 1 ? "#f97316" : "#0ea5e9"}
            emissiveIntensity={0.5}
          />
          <Html center>
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-zinc-600 shadow">
              t{point.step}
            </span>
          </Html>
        </mesh>
      ))}
      <mesh position={target}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.6} />
      </mesh>
      <axesHelper args={[1.5]} />
      <OrbitControls
        ref={controlsRef}
        target={lookTarget}
        enableDamping
        dampingFactor={0.1}
        enablePan={enablePan}
        panSpeed={0.6}
      />
    </>
  )
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-6 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
