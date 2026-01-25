export const ProjectStage = {
  idea: 'Idea',
  prototype: 'Prototype',
  mvp: 'MVP',
}

export const ProjectSubmissionType = {
  idea: 'IDEA',
  document: 'DOCUMENT',
  demoLink: 'DEMO_LINK',
  video: 'VIDEO',
}

export const SubmissionStatus = {
  pending: 'Pending',
  reviewed: 'Reviewed',
  approved: 'Approved',
}

export const submissionTypeLabel = (type) => {
  switch (type) {
    case ProjectSubmissionType.idea:
      return 'Idea'
    case ProjectSubmissionType.document:
      return 'Document'
    case ProjectSubmissionType.demoLink:
      return 'Demo link'
    case ProjectSubmissionType.video:
      return 'Video'
    default:
      return String(type ?? 'Submission')
  }
}

export const normalizeStage = (stage) => {
  if (!stage) return ProjectStage.idea
  if (Object.values(ProjectStage).includes(stage)) return stage
  const key = String(stage).toLowerCase()
  if (key === 'idea') return ProjectStage.idea
  if (key === 'prototype') return ProjectStage.prototype
  if (key === 'mvp') return ProjectStage.mvp
  return ProjectStage.idea
}

export const canAddNonIdeaSubmissions = (submissions) => {
  return (submissions ?? []).some((s) => s.type === ProjectSubmissionType.idea)
}

export const validateIdeaPayload = (payload) => {
  const errors = {}
  const req = (k, label) => {
    const v = payload?.[k]
    if (!String(v ?? '').trim()) errors[k] = `${label} is required`
  }

  req('title', 'Project title')
  req('problemStatement', 'Problem statement')
  req('targetUsers', 'Target users')
  req('proposedSolution', 'Proposed solution')

  const stage = payload?.stage
  if (!Object.values(ProjectStage).includes(stage)) {
    errors.stage = 'Project stage is required'
  }

  return { ok: Object.keys(errors).length === 0, errors }
}
