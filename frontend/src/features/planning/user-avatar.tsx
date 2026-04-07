import type { SiteCalendarAssignment } from './types'

export function getInitials(fullName: string): string {
  if (!fullName) return ''
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface UserAvatarProps {
  assignment: SiteCalendarAssignment
  size?: 'sm' | 'md'
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-6 w-6 text-[10px]',
}

export function UserAvatar({ assignment, size = 'sm' }: UserAvatarProps) {
  const cls = sizeClasses[size]
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground ${cls}`}
      title={assignment.userFullName}
    >
      {assignment.userAvatarUrl ? (
        <img
          src={assignment.userAvatarUrl}
          alt={assignment.userFullName}
          className={`rounded-full ${cls}`}
        />
      ) : (
        getInitials(assignment.userFullName)
      )}
    </div>
  )
}

interface UserAvatarStackProps {
  assignments: SiteCalendarAssignment[]
  max?: number
  size?: 'sm' | 'md'
}

export function UserAvatarStack({ assignments, max = 3, size = 'sm' }: UserAvatarStackProps) {
  if (!assignments || assignments.length === 0) return null

  const overflow = assignments.length - max

  return (
    <div className="flex -space-x-1">
      {assignments.slice(0, max).map((a) => (
        <UserAvatar key={a.userId} assignment={a} size={size} />
      ))}
      {overflow > 0 && (
        <span className={`flex items-center justify-center rounded-full bg-muted text-muted-foreground ${sizeClasses[size]}`}>
          +{overflow}
        </span>
      )}
    </div>
  )
}
