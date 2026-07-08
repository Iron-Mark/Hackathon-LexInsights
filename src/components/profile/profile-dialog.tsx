'use client'

import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { useRouter } from 'next/navigation'
import { PlanLimitsPanel } from '@/components/profile/plan-limits-panel'

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, signOut } = useAuthStore()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    onOpenChange(false)
    router.push('/auth/login')
  }

  if (!user) return null

  const userMetadata = user.user_metadata || {}
  const email = user.email || 'No email'
  const fullName = user.full_name || userMetadata.full_name || userMetadata.name || 'User'
  const avatarUrl = user.avatar_url || userMetadata.avatar_url
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg dark:border-iris-300/15 dark:bg-[#171322]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <User className="h-5 w-5 text-iris-600 dark:text-iris-200" />
            Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              <span
                aria-label="Profile"
                className="h-24 w-24 rounded-full border-4 border-iris-100 bg-cover bg-center dark:border-iris-400/30"
                role="img"
                style={{ backgroundImage: `url(${avatarUrl})` }}
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-iris-100 bg-gradient-to-br from-iris-500 to-iris-700 dark:border-iris-400/30">
                <User className="h-12 w-12 text-white" />
              </div>
            )}
            <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-slate-100">{fullName}</h2>
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-[#241f32]">
              <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Email</p>
                <p className="break-all text-sm text-slate-950 dark:text-slate-100">{email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-[#241f32]">
              <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Member Since</p>
                <p className="text-sm text-slate-950 dark:text-slate-100">{createdAt}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-[#241f32]">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
              <div className="flex-1">
                <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">Account Status</p>
                <p className="text-sm text-slate-950 dark:text-slate-100">
                  {user.email_confirmed_at ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-300">
                      <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-300"></span>
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-600 dark:bg-amber-300"></span>
                      Pending Verification
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Plan & request limits */}
          <PlanLimitsPanel />

          {/* Actions */}
          <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-iris-300/15">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-400/10 dark:hover:text-red-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
