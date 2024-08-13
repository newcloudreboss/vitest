import type { TransformResult as ViteTransformResult } from 'vite'
import type { ReportOptions } from 'istanbul-reports'
import type { AfterSuiteRunMeta, Arrayable } from '../../types/general'
import type { Vitest } from '../core'

type TransformResult =
  | string
  | Partial<ViteTransformResult>
  | undefined
  | null
  | void
type CoverageResults = unknown

export interface CoverageProvider {
  name: string

  /** Called when provider is being initialized before tests run */
  initialize: (ctx: Vitest) => Promise<void> | void

  /** Called when setting coverage options for Vitest context (`ctx.config.coverage`) */
  resolveOptions: () => ResolvedCoverageOptions

  /** Callback to clean previous reports */
  clean: (clean?: boolean) => void | Promise<void>

  /** Called with coverage results after a single test file has been run */
  onAfterSuiteRun: (meta: AfterSuiteRunMeta) => void | Promise<void>

  /** Callback to generate final coverage results */
  generateCoverage: (
    reportContext: ReportContext
  ) => CoverageResults | Promise<CoverageResults>

  /** Callback to convert coverage results to coverage reports. Called with results returned from `generateCoverage` */
  reportCoverage: (
    coverage: CoverageResults,
    reportContext: ReportContext
  ) => void | Promise<void>

  /** Callback for `--merge-reports` options. Called with multiple coverage results generated by `generateCoverage`. */
  mergeReports?: (coverages: CoverageResults[]) => void | Promise<void>

  /** Callback called for instrumenting files with coverage counters. */
  onFileTransform?: (
    sourceCode: string,
    id: string,
    // TODO: when upgrading vite, import Rollup from vite
    pluginCtx: any
  ) => TransformResult | Promise<TransformResult>
}

export interface ReportContext {
  /** Indicates whether all tests were run. False when only specific tests were run. */
  allTestsRun?: boolean
}

export interface CoverageProviderModule {
  /**
   * Factory for creating a new coverage provider
   */
  getProvider: () => CoverageProvider | Promise<CoverageProvider>

  /**
   * Executed before tests are run in the worker thread.
   */
  startCoverage?: () => unknown | Promise<unknown>

  /**
   * Executed on after each run in the worker thread. Possible to return a payload passed to the provider
   */
  takeCoverage?: () => unknown | Promise<unknown>

  /**
   * Executed after all tests have been run in the worker thread.
   */
  stopCoverage?: () => unknown | Promise<unknown>
}

export type CoverageReporter = keyof ReportOptions | (string & {})

export type CoverageReporterWithOptions<
  ReporterName extends CoverageReporter = CoverageReporter,
> = ReporterName extends keyof ReportOptions
  ? ReportOptions[ReporterName] extends never
    ? [ReporterName, object] // E.g. the "none" reporter
    : [ReporterName, Partial<ReportOptions[ReporterName]>]
  : [ReporterName, Record<string, unknown>]

export type CoverageProviderName = 'v8' | 'istanbul' | 'custom' | undefined

export type CoverageOptions<T extends CoverageProviderName = CoverageProviderName> =
  T extends 'istanbul'
    ? { provider: T } & CoverageIstanbulOptions
    : T extends 'v8' ? {
      /**
       * Provider to use for coverage collection.
       *
       * @default 'v8'
       */
      provider: T
    } & CoverageV8Options
      : T extends 'custom'
        ? { provider: T } & CustomProviderOptions
        : { provider?: T } & CoverageV8Options

/** Fields that have default values. Internally these will always be defined. */
type FieldsWithDefaultValues =
  | 'enabled'
  | 'clean'
  | 'cleanOnRerun'
  | 'reportsDirectory'
  | 'exclude'
  | 'extension'
  | 'reportOnFailure'
  | 'allowExternal'
  | 'processingConcurrency'

export type ResolvedCoverageOptions<T extends CoverageProviderName = CoverageProviderName> =
  CoverageOptions<T> &
  Required<Pick<CoverageOptions<T>, FieldsWithDefaultValues>> & { // Resolved fields which may have different typings as public configuration API has
    reporter: CoverageReporterWithOptions[]
  }

export interface BaseCoverageOptions {
  /**
   * Enables coverage collection. Can be overridden using `--coverage` CLI option.
   *
   * @default false
   */
  enabled?: boolean

  /**
   * List of files included in coverage as glob patterns
   *
   * @default ['**']
   */
  include?: string[]

  /**
   * Extensions for files to be included in coverage
   *
   * @default ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte', '.marko']
   */
  extension?: string | string[]

  /**
   * List of files excluded from coverage as glob patterns
   *
   * @default ['coverage/**', 'dist/**', '**\/[.]**', 'packages/*\/test?(s)/**', '**\/*.d.ts', '**\/virtual:*', '**\/__x00__*', '**\/\x00*', 'cypress/**', 'test?(s)/**', 'test?(-*).?(c|m)[jt]s?(x)', '**\/*{.,-}{test,spec}?(-d).?(c|m)[jt]s?(x)', '**\/__tests__/**', '**\/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*', '**\/vitest.{workspace,projects}.[jt]s?(on)', '**\/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}']
   */
  exclude?: string[]

  /**
   * Whether to include all files, including the untested ones into report
   *
   * @default true
   */
  all?: boolean

  /**
   * Clean coverage results before running tests
   *
   * @default true
   */
  clean?: boolean

  /**
   * Clean coverage report on watch rerun
   *
   * @default true
   */
  cleanOnRerun?: boolean

  /**
   * Directory to write coverage report to
   *
   * @default './coverage'
   */
  reportsDirectory?: string

  /**
   * Coverage reporters to use.
   * See [istanbul documentation](https://istanbul.js.org/docs/advanced/alternative-reporters/) for detailed list of all reporters.
   *
   * @default ['text', 'html', 'clover', 'json']
   */
  reporter?:
    | Arrayable<CoverageReporter>
    | (CoverageReporter | [CoverageReporter] | CoverageReporterWithOptions)[]

  /**
   * Do not show files with 100% statement, branch, and function coverage
   *
   * @default false
   */
  skipFull?: boolean

  /**
   * Configurations for thresholds
   *
   * @example
   *
   * ```ts
   * {
   *   // Thresholds for all files
   *   functions: 95,
   *   branches: 70,
   *   perFile: true,
   *   autoUpdate: true,
   *
   *   // Thresholds for utilities
   *   'src/utils/**.ts': {
   *     lines: 100,
   *     statements: 95,
   *   }
   * }
   * ```
   */
  thresholds?:
    | Thresholds
    | ({
      [glob: string]: Pick<
        Thresholds,
          100 | 'statements' | 'functions' | 'branches' | 'lines'
      >
    } & Thresholds)

  /**
   * Watermarks for statements, lines, branches and functions.
   *
   * Default value is `[50,80]` for each property.
   */
  watermarks?: {
    statements?: [number, number]
    functions?: [number, number]
    branches?: [number, number]
    lines?: [number, number]
  }

  /**
   * Generate coverage report even when tests fail.
   *
   * @default false
   */
  reportOnFailure?: boolean

  /**
   * Collect coverage of files outside the project `root`.
   *
   * @default false
   */
  allowExternal?: boolean

  /**
   * Apply exclusions again after coverage has been remapped to original sources.
   * This is useful when your source files are transpiled and may contain source maps
   * of non-source files.
   *
   * Use this option when you are seeing files that show up in report even if they
   * match your `coverage.exclude` patterns.
   *
   * @default false
   */
  excludeAfterRemap?: boolean

  /**
   * Concurrency limit used when processing the coverage results.
   * Defaults to `Math.min(20, os.availableParallelism?.() ?? os.cpus().length)`
   */
  processingConcurrency?: number
}

export interface CoverageIstanbulOptions extends BaseCoverageOptions {
  /**
   * Set to array of class method names to ignore for coverage
   *
   * @default []
   */
  ignoreClassMethods?: string[]
}

export interface CoverageV8Options extends BaseCoverageOptions {
  /**
   * Ignore empty lines, comments and other non-runtime code, e.g. Typescript types
   */
  ignoreEmptyLines?: boolean
}

export interface CustomProviderOptions
  extends Pick<BaseCoverageOptions, FieldsWithDefaultValues> {
  /** Name of the module or path to a file to load the custom provider from */
  customProviderModule: string
}

interface Thresholds {
  /** Set global thresholds to `100` */
  100?: boolean

  /** Check thresholds per file. */
  perFile?: boolean

  /**
   * Update threshold values automatically when current coverage is higher than earlier thresholds
   *
   * @default false
   */
  autoUpdate?: boolean

  /** Thresholds for statements */
  statements?: number

  /** Thresholds for functions */
  functions?: number

  /** Thresholds for branches */
  branches?: number

  /** Thresholds for lines */
  lines?: number
}