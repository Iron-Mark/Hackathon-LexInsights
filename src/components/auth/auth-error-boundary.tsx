'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface AuthErrorBoundaryState {
  hasError: boolean
}

export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  state: AuthErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): AuthErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[auth] Clerk auth surface failed to render.', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}
