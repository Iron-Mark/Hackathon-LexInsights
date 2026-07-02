'use client'

import { useAuthStore } from '@/lib/store/auth-store'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function UserMenu() {
  const { user, signOut } = useAuthStore()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  if (!user) return null

  // Get first letter of email for avatar fallback
  const avatarFallback = user.email.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#171322]"
          aria-label="Open account menu"
          type="button"
        >
          <Avatar className="size-9 sm:size-10 cursor-pointer">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.email} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm sm:text-base">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 sm:w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="truncate text-xs text-gray-500 dark:text-slate-400 sm:text-sm">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600 min-h-[44px] text-sm sm:text-base gover:bg-red/50"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
