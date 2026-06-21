'use client'

import { Globe, ExternalLink, BookOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ResourcesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GovernmentResource {
  id: string
  title: string
  description: string
  url: string
  category: string
}

const GOVERNMENT_RESOURCES: GovernmentResource[] = [
  {
    id: '1',
    title: 'Official Gazette - Laws and Issuances',
    description: 'Official repository of Philippine laws, executive orders, and proclamations',
    url: 'https://www.officialgazette.gov.ph/section/laws/',
    category: 'Laws'
  },
  {
    id: '2',
    title: 'Supreme Court E-Library',
    description: 'Access to Supreme Court decisions and jurisprudence',
    url: 'https://elibrary.judiciary.gov.ph/',
    category: 'Jurisprudence'
  },
  {
    id: '3',
    title: 'House of Representatives',
    description: 'Bills, resolutions, and legislative information',
    url: 'https://www.congress.gov.ph/',
    category: 'Legislature'
  },
  {
    id: '4',
    title: 'Senate of the Philippines',
    description: 'Senate bills, resolutions, and committee reports',
    url: 'https://legacy.senate.gov.ph/',
    category: 'Legislature'
  },
  {
    id: '5',
    title: 'Department of Justice',
    description: 'Legal opinions, circulars, and department orders',
    url: 'https://www.doj.gov.ph/',
    category: 'Executive'
  },
  {
    id: '6',
    title: 'National Privacy Commission',
    description: 'Data privacy advisories, circulars, and compliance guides',
    url: 'https://www.privacy.gov.ph/',
    category: 'Regulatory'
  },
  {
    id: '7',
    title: 'Department of Labor and Employment',
    description: 'Labor advisories, department orders, and employment regulations',
    url: 'https://www.dole.gov.ph/',
    category: 'Labor'
  },
  {
    id: '8',
    title: 'Bureau of Internal Revenue',
    description: 'Tax regulations, revenue memorandum circulars, and rulings',
    url: 'https://www.bir.gov.ph/',
    category: 'Taxation'
  },
  {
    id: '9',
    title: 'Department of Trade and Industry',
    description: 'Business regulations, consumer protection, and trade policies',
    url: 'https://www.dti.gov.ph/',
    category: 'Business'
  },
  {
    id: '10',
    title: 'Securities and Exchange Commission',
    description: 'Corporate regulations, securities laws, and compliance requirements',
    url: 'https://www.sec.gov.ph/',
    category: 'Corporate'
  },
]

export function ResourcesDialog({ open, onOpenChange }: ResourcesDialogProps) {
  const handleResourceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const categories = Array.from(new Set(GOVERNMENT_RESOURCES.map(r => r.category)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-iris-600" />
            Philippine Government Resources
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Official sources for Philippine laws, regulations, and compliance information
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 px-1">
                {category}
              </h3>
              <div className="space-y-2">
                {GOVERNMENT_RESOURCES.filter(r => r.category === category).map((resource) => (
                  <div
                    key={resource.id}
                    onClick={() => handleResourceClick(resource.url)}
                    className="p-4 border border-slate-200 rounded-lg hover:border-iris-300 hover:bg-iris-50/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-iris-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-slate-900 group-hover:text-iris-700">
                            {resource.title}
                          </h4>
                          <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0 group-hover:text-iris-600" />
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {resource.description}
                        </p>
                        <div className="mt-2 text-xs text-slate-500 truncate">
                          {resource.url}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t text-xs text-slate-500">
          <p>
            <strong>Note:</strong> These are official Philippine government websites. 
            Always verify information with the relevant authorities for legal compliance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
