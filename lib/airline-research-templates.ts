export type AirlineResearchImportTemplate = {
  airlineId: string
  profile: string[]
  recruitment: string[]
  interview: string[]
  application: string[]
  source: { title: string; url: string; date: string; grade: '' | 'A' | 'B' | 'C' | 'D' | 'E' }
}

// Input scaffold only. It intentionally contains no Emirates claims or URLs.
export const emiratesResearchTemplate: AirlineResearchImportTemplate = {
  airlineId: 'emirates',
  profile: [],
  recruitment: [],
  interview: [],
  application: [],
  source: { title: '', url: '', date: '', grade: '' },
}
