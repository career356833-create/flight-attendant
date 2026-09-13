import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { analyzeNonverbalSignals, deriveCameraCheckStatus, type NonverbalFrameSample } from './nonverbal-signal-coach'

const face = (index: number, values: Partial<NonverbalFrameSample> = {}): NonverbalFrameSample => ({
  timestampMs: index * 250,
  faceCount: 1,
  faceDetected: true,
  faceCenterX: .5,
  faceCenterY: .45,
  faceAreaRatio: .16,
  headYawApprox: 0,
  headPitchApprox: 0,
  headRollApprox: 0,
  mouthShapeMetric: .2,
  ...values,
})

const stable = (count = 24) => Array.from({ length: count }, (_, index) => face(index))
const analyze = (samples = stable(), durationMs = 6000) => analyzeNonverbalSignals({ enabled: true, supported: true, samples, analyzedDurationMs: durationMs })

test('camera disabled fails closed', () => assert.equal(analyzeNonverbalSignals({ enabled: false, samples: [], analyzedDurationMs: 30000 }).insufficientReason, 'CAMERA_DISABLED'))
test('unsupported local detector fails closed', () => assert.equal(analyzeNonverbalSignals({ enabled: true, supported: false, samples: [], analyzedDurationMs: 30000 }).insufficientReason, 'CAMERA_UNSUPPORTED'))
test('denied camera permission is preserved in the summary', () => assert.equal(analyzeNonverbalSignals({ enabled: true, supported: false, permissionDenied: true, samples: [], analyzedDurationMs: 30000 }).insufficientReason, 'CAMERA_PERMISSION_DENIED'))
test('permission denied has an explicit camera-check state', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'denied', samples: [] }), 'PERMISSION_DENIED'))
test('no face has an explicit camera-check state', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'granted', samples: [{ timestampMs: 0, faceCount: 0, faceDetected: false }] }), 'NO_FACE'))
test('multiple faces have an explicit camera-check state', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'granted', samples: [face(0, { faceCount: 2 }), face(1, { faceCount: 2 })] }), 'MULTIPLE_FACES'))
test('small face has an explicit camera-check state', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'granted', samples: [face(0, { faceAreaRatio: .03 })] }), 'FACE_TOO_SMALL'))
test('off-center face has an explicit camera-check state', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'granted', samples: [face(0, { faceCenterX: .9 })] }), 'FACE_OFF_CENTER'))
test('sufficient camera signal becomes ready', () => assert.equal(deriveCameraCheckStatus({ enabled: true, permission: 'granted', samples: stable(6) }), 'READY'))
test('no detected face fails analysis closed', () => assert.equal(analyze(Array.from({ length: 12 }, (_, timestampMs) => ({ timestampMs, faceCount: 0, faceDetected: false }))).insufficientReason, 'NO_FACE'))
test('frequent multiple faces fail analysis closed', () => assert.equal(analyze(Array.from({ length: 12 }, (_, index) => face(index, { faceCount: index < 4 ? 2 : 1 }))).insufficientReason, 'MULTIPLE_FACES'))
test('too few frames fail analysis closed', () => assert.equal(analyze(stable(4), 2000).insufficientReason, 'TOO_FEW_FRAMES'))
test('too-short duration fails analysis closed', () => assert.equal(analyze(stable(12), 1200).insufficientReason, 'TOO_FEW_FRAMES'))
test('stable framing is reported from observed geometry', () => assert.equal(analyze().framingStability, 'FRAMING_STABLE'))
test('variable framing is distinguished from stable framing', () => assert.equal(analyze(stable().map((sample, index) => ({ ...sample, faceCenterX: index % 2 ? .72 : .5 }))).framingStability, 'FRAMING_VARIABLE'))
test('frequent off-center framing is reported', () => assert.equal(analyze(stable().map(sample => ({ ...sample, faceCenterX: .85 }))).framingStability, 'OFF_CENTER_FREQUENT'))
test('low head movement is reported for stable orientation', () => assert.equal(analyze().headMovementLevel, 'LOW'))
test('high head movement is reported for alternating orientation', () => assert.equal(analyze(stable().map((sample, index) => ({ ...sample, headYawApprox: index % 2 ? .4 : -.4 }))).headMovementLevel, 'HIGH'))
test('low expression variation is based on mouth-shape geometry', () => assert.equal(analyze().expressionVariation, 'LOW'))
test('moderate expression variation is observable without emotion labels', () => assert.equal(analyze(stable().map((sample, index) => ({ ...sample, mouthShapeMetric: index % 2 ? .27 : .2 }))).expressionVariation, 'MODERATE'))
test('start and finish smile-shape observations can differ', () => {
  const result = analyze(stable().map((sample, index) => ({ ...sample, mouthShapeMetric: index < 12 ? .2 : .35 })))
  assert.equal(result.smileShapeStart, 'NEUTRAL_MOUTH_SHAPE')
  assert.equal(result.smileShapeEnd, 'SMILE_SHAPE_PRESENT')
})
test('stable posture proxy is reported', () => assert.equal(analyze().postureStability, 'POSTURE_STABLE'))
test('frequent leaning proxy is reported', () => assert.equal(analyze(stable().map(sample => ({ ...sample, headRollApprox: .25 }))).postureStability, 'LEANING_FREQUENT'))
test('high positional movement is reported', () => assert.equal(analyze(stable().map((sample, index) => ({ ...sample, faceCenterX: index % 2 ? .7 : .3 }))).postureStability, 'BODY_MOVEMENT_HIGH'))
test('timeline contains start middle and finish segments', () => assert.deepEqual(analyze().timeline.map(item => item.phase), ['start', 'middle', 'finish']))
test('timeline bounds stay inside analyzed duration', () => assert.ok(analyze().timeline.every(item => item.fromMs >= 0 && item.toMs <= 6000)))
test('result has explicit local vision provenance', () => assert.equal(analyze().provenance, 'vision_metrics'))
test('result contains no aggregate or hiring score', () => assert.doesNotMatch(JSON.stringify(analyze()), /overallScore|passProbability|hireProbability|score/i))
test('result contains no emotion personality or sensitive inference', () => assert.doesNotMatch(JSON.stringify(analyze()), /emotion|personality|gender|birthDate|ethnicity|identity/i))
test('result persists no raw frame samples', () => assert.doesNotMatch(JSON.stringify(analyze()), /faceCenterX|faceCenterY|faceAreaRatio|mouthShapeMetric/))
test('30-second challenge duration is preserved as summary metadata', () => assert.equal(analyze(stable(), 30000).analyzedDurationMs, 30000))
test('60-second challenge duration is preserved as summary metadata', () => assert.equal(analyze(stable(), 60000).analyzedDurationMs, 60000))
test('90-second challenge duration is preserved as summary metadata', () => assert.equal(analyze(stable(), 90000).analyzedDurationMs, 90000))
test('analysis is language-neutral for Korean self introduction', () => assert.equal(analyze().provenance, 'vision_metrics'))
test('analysis is language-neutral for English self introduction', () => assert.equal(analyze().provenance, 'vision_metrics'))
test('single multiple-face frame is excluded without invalidating a long session', () => {
  const samples = stable()
  samples[4] = face(4, { faceCount: 2 })
  const result = analyze(samples)
  assert.equal(result.insufficientReason, undefined)
  assert.equal(result.multipleFacesObserved, true)
})
test('disabled camera produces no misleading positive observation', () => assert.deepEqual(analyzeNonverbalSignals({ enabled: false, samples: [], analyzedDurationMs: 60000 }).positiveObservations, []))
test('camera hook contains cleanup but no remote frame transport', () => {
  const source = readFileSync(new URL('../components/self-introduction/use-nonverbal-camera.ts', import.meta.url), 'utf8')
  assert.match(source, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/)
  assert.match(source, /srcObject = null/)
  assert.match(source, /requestId !== cameraRequestRef\.current/)
  assert.doesNotMatch(source, /fetch\(|FormData|drawImage|toDataURL|upload/)
})
test('self introduction keeps vision summary on audio-only results', () => {
  const source = readFileSync(new URL('../components/self-introduction/self-introduction-components.tsx', import.meta.url), 'utf8')
  const audioOnly = source.slice(source.indexOf('AUDIO ONLY'), source.indexOf('const previous'))
  assert.match(audioOnly, /NonverbalSignalCard/)
})
test('remote attempt mapping does not persist the local-only vision summary', () => {
  const source = readFileSync(new URL('./supabase/training-attempt-repositories.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /nonverbalSignal/)
})
