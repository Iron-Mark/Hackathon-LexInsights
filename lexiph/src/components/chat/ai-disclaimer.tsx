'use client'

import { AlertTriangle, Info } from 'lucide-react'
import { useState } from 'react'

export function AIDisclaimer() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-amber-900">
              AI-Generated Analysis
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-700 hover:text-amber-900 text-xs font-medium underline"
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Show less' : 'Read full disclaimer'}
            </button>
          </div>
          
          <p className="font-body text-xs text-amber-800 mt-1">
            This analysis is AI-generated for informational purposes only and does not constitute legal advice.
          </p>

          {isExpanded && (
            <div className="mt-3 space-y-2 text-xs text-amber-800 border-t border-amber-200 pt-3">
              <p className="font-medium">This AI tool is NOT a substitute for:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Professional legal advice from licensed attorneys</li>
                <li>Official compliance audits by government agencies</li>
                <li>Consultation with certified compliance experts</li>
                <li>Formal validation by relevant government offices</li>
              </ul>

              <p className="font-medium mt-3">Users are strongly advised to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Verify all findings with official government sources</li>
                <li>Consult with legal counsel before making compliance decisions</li>
                <li>Submit documents to proper authorities for official review</li>
                <li>Seek guidance from relevant regulatory agencies (NDRRMC, OCD, etc.)</li>
              </ul>

              <div className="mt-3 p-2 bg-amber-100 rounded border border-amber-300">
                <p className="font-semibold">⚖️ Limitation of Liability</p>
                <p className="mt-1">
                  The creators and operators of LexInSight assume no liability for decisions made based on this analysis. 
                  Users bear full responsibility for ensuring compliance with all applicable laws and regulations.
                </p>
              </div>

              <p className="mt-3 text-center italic">
                Always seek professional legal counsel for critical compliance decisions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AIDisclaimerBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium border border-amber-200">
      <Info className="h-3 w-3" aria-hidden="true" />
      <span>AI-Generated • Not Legal Advice</span>
    </div>
  )
}
