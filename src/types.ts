export type UserRole = 'admin' | 'learner'

export interface UserProfile {
  id: string
  display_name: string | null
  role: UserRole
  created_at: string
}
