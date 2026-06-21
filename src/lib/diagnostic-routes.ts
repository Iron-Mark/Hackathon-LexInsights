export function areDiagnosticRoutesEnabled() {
  return process.env.ENABLE_DIAGNOSTIC_ROUTES === 'true'
}
