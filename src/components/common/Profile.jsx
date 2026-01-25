import { useState } from 'react'
import { User, Mail, School, BookOpen, Award, Edit2, Save, X } from 'lucide-react'
import Card from '../../components/common/Card'
import { useAuth } from '../../hooks/useAuth'
import { useData } from '../../hooks/useData'
import { useToast } from '../../hooks/useToast'

const BADGES = {
  first_submission: { label: 'First Submission', icon: '🎯', color: 'bg-success-50 text-success-700' },
  perfect_attendance: { label: 'Perfect Attendance', icon: '📅', color: 'bg-secondary-50 text-secondary-700' },
  team_player: { label: 'Team Player', icon: '🤝', color: 'bg-primary/10 text-primary' },
  top_performer: { label: 'Top Performer', icon: '⭐', color: 'bg-warning-50 text-warning-700' },
}

export default function Profile() {
  const { currentUser, role } = useAuth()
  const { data } = useData()
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editedProfile, setEditedProfile] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    university: currentUser?.university ?? '',
    major: currentUser?.major ?? '',
    bio: currentUser?.bio ?? '',
    expertise: currentUser?.expertise ?? '',
  })

  const user = (data?.users ?? []).find((u) => u.id === currentUser?.id)

  const maskedUserId = user?.id ? `${user.id.slice(0, 8)}…${user.id.slice(-4)}` : ''

  const handleEdit = () => {
    setIsEditing(true)
    setEditedProfile({
      name: user?.name ?? '',
      email: user?.email ?? '',
      university: user?.university ?? '',
      major: user?.major ?? '',
      bio: user?.bio ?? '',
      expertise: user?.expertise ?? '',
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = () => {
    showToast('Profile updated successfully!', 'success')
    setIsEditing(false)
  }

  const handleChange = (field, value) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }))
  }

  const myPrograms =
    role === 'coach'
      ? (data?.programs ?? []).filter((p) => p.coachIds.includes(user?.id))
      : (data?.programs ?? []).filter((p) => p.participantStudentIds.includes(user?.id))

  const myStats =
    role === 'student'
      ? {
          xp: user?.xp ?? 0,
          level: user?.level ?? 1,
          badges: user?.badges ?? [],
          programsCount: myPrograms.length,
        }
      : {
          programsCount: myPrograms.length,
          studentsCount: myPrograms.reduce(
            (sum, p) => sum + p.participantStudentIds.length,
            0
          ),
        }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="mt-1 text-muted-foreground">Manage your profile information</p>
        </div>
        {!isEditing ? (
          <button type="button" className="btn-primary" onClick={handleEdit}>
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Basic Information">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground">Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editedProfile.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {user.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editedProfile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  )}
                </div>
              </div>

              {role === 'student' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      University
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editedProfile.university}
                        onChange={(e) => handleChange('university', e.target.value)}
                      />
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-foreground">
                        <School className="h-4 w-4 text-muted-foreground" />
                        {user.university}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground">Major</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editedProfile.major}
                        onChange={(e) => handleChange('major', e.target.value)}
                      />
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-foreground">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        {user.major}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {role === 'coach' && user.expertise && (
                <div>
                  <label className="block text-sm font-medium text-foreground">
                    Expertise
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={editedProfile.expertise}
                      onChange={(e) => handleChange('expertise', e.target.value)}
                    />
                  ) : (
                    <div className="mt-2 text-foreground">{user.expertise}</div>
                  )}
                </div>
              )}

              {user.bio && (
                <div>
                  <label className="block text-sm font-medium text-foreground">Bio</label>
                  {isEditing ? (
                    <textarea
                      className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      rows={4}
                      value={editedProfile.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                    />
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">{user.bio}</p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="My Programs">
            {myPrograms.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No programs yet
              </div>
            ) : (
              <div className="space-y-2">
                {myPrograms.map((program) => (
                  <div
                    key={program.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3"
                  >
                    <div>
                      <div className="font-medium text-foreground">{program.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {program.participantStudentIds.length} participant
                        {program.participantStudentIds.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {role === 'student' && (
            <>
              <Card title="Level & XP">
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{myStats.level}</div>
                      <div className="text-xs">Level</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total XP</div>
                    <div className="text-2xl font-bold text-foreground">{myStats.xp}</div>
                  </div>
                </div>
              </Card>

              {myStats.badges.length > 0 && (
                <Card title="Badges" subtitle={`${myStats.badges.length} earned`}>
                  <div className="flex flex-wrap gap-2">
                    {myStats.badges.map((badgeKey) => {
                      const badge = BADGES[badgeKey]
                      if (!badge) return null
                      return (
                        <div
                          key={badgeKey}
                          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${badge.color}`}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </>
          )}

          <Card title="Statistics">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Programs</span>
                <span className="text-lg font-semibold text-foreground">
                  {myStats.programsCount}
                </span>
              </div>
              {role === 'coach' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Students</span>
                  <span className="text-lg font-semibold text-foreground">
                    {myStats.studentsCount}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card title="Account">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium capitalize text-foreground">{role}</span>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-xs font-semibold text-primary hover:text-primary-600 focus:outline-none focus:underline"
                >
                  {showAdvanced ? 'Hide advanced' : 'Show advanced'}
                </button>
              </div>

              {showAdvanced && user?.id && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">User ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground" title={user.id}>
                      {maskedUserId}
                    </span>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(user.id)
                          showToast('User ID copied to clipboard', 'success')
                        } catch {
                          showToast('Could not copy User ID', 'error')
                        }
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
