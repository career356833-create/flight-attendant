import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const airlineSource = read('lib/airline-data.ts')
const knowledgeSource = read('lib/airline-knowledge-data.ts')
const repositorySource = read('lib/airline-knowledge-repository.ts')
const ko = JSON.parse(read('lib/locales/ko.json'))
const en = JSON.parse(read('lib/locales/en.json'))

const airlineIds = [...airlineSource.matchAll(/^\s*airline\('([^']+)'/gm)].map((match) => match[1])
const urlBlock = knowledgeSource.match(/officialCareerUrls:[\s\S]*?= \{([\s\S]*?)\n\}/)?.[1] ?? ''
const urlEntries = [...urlBlock.matchAll(/^\s*([a-z0-9_]+):\s*'([^']+)'/gm)]
const urls = new Map(urlEntries.map((match) => [match[1], match[2]]))
const errors = []

if (airlineIds.length !== 60) errors.push(`expected 60 airlines, found ${airlineIds.length}`)
if (new Set(airlineIds).size !== airlineIds.length) errors.push('duplicate airline IDs found')
for (const id of airlineIds) {
  if (!urls.has(id)) errors.push(`missing official career URL: ${id}`)
  else if (!urls.get(id).startsWith('https://')) errors.push(`non-HTTPS career URL: ${id}`)
}
for (const id of urls.keys()) if (!airlineIds.includes(id)) errors.push(`orphan career URL: ${id}`)
if (urls.size !== 60) errors.push(`expected 60 career URLs, found ${urls.size}`)
if (knowledgeSource.includes('example.invalid')) errors.push('mock URL remains in the data pack')
if (!repositorySource.includes("resource.publisher!=='MOCK DATA'")) errors.push('legacy mock-resource migration is missing')
if (!repositorySource.includes('schemaVersion:2')) errors.push('schema version 2 migration is missing')

const flatten = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => {
  const next = prefix ? `${prefix}.${key}` : key
  return child && typeof child === 'object' && !Array.isArray(child) ? flatten(child, next) : [next]
})
const koKeys = new Set(flatten(ko))
const enKeys = new Set(flatten(en))
for (const key of koKeys) if (!enKeys.has(key)) errors.push(`English locale missing: ${key}`)
for (const key of enKeys) if (!koKeys.has(key)) errors.push(`Korean locale missing: ${key}`)

const requiredCountries = [...new Set([...airlineSource.matchAll(/airline\([^\n]+?,\s*'([A-Z]{2})',/g)].map((match) => match[1]))]
for (const country of requiredCountries) {
  if (!ko.airlineSelection?.countries?.[country]) errors.push(`Korean country label missing: ${country}`)
  if (!en.airlineSelection?.countries?.[country]) errors.push(`English country label missing: ${country}`)
}

if (errors.length) {
  console.error(`Airline data pack validation failed (${errors.length})`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Airline data pack OK: ${airlineIds.length} airlines, ${urls.size} official-career seeds, ${koKeys.size} mirrored locale keys.`)
