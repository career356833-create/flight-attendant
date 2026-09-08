import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  audioInputConstraints,
  canStartAfterMicCheck,
  deriveMicInputState,
  normalizeAudioInputDevices,
  stopMediaStream,
  summarizeMicFrames,
  type MicInputMeasurement,
} from './mic-check'

const measurement = (values: Partial<MicInputMeasurement> = {}): MicInputMeasurement => ({
  rmsDbfs: -35, peakDbfs: -20, activeDurationMs: 2000, durationMs: 4000, ...values,
})
const frame = (amplitude: number, length = 32) => Float32Array.from({ length }, (_, index) => index % 2 ? -amplitude : amplitude)
const componentSource = readFileSync('components/self-introduction/self-introduction-components.tsx', 'utf8')
const hookSource = readFileSync('components/interview-practice/use-microphone-check.ts', 'utf8')
const interviewSource = readFileSync('components/interview-practice/interview-practice-engine.tsx', 'utf8')
const selfIntroSource = readFileSync('components/self-introduction/self-introduction-flow.tsx', 'utf8')
const homeSource = readFileSync('components/home-dashboard.tsx', 'utf8')

test('no devices is safe', () => assert.deepEqual(normalizeAudioInputDevices([]), []))
test('one audio input is normalized', () => assert.deepEqual(normalizeAudioInputDevices([{ kind: 'audioinput', deviceId: 'a', label: 'Web Camera' }]), [{ deviceId: 'a', label: 'Web Camera' }]))
test('multiple devices exclude non-input devices', () => assert.equal(normalizeAudioInputDevices([{ kind: 'audioinput', deviceId: 'a', label: 'A' }, { kind: 'audiooutput', deviceId: 'b', label: 'B' }, { kind: 'audioinput', deviceId: 'c', label: 'C' }]).length, 2))
test('unlabelled devices receive a safe display label', () => assert.equal(normalizeAudioInputDevices([{ kind: 'audioinput', deviceId: 'a', label: '' }])[0]?.label, '마이크 1'))
test('duplicate device ids are removed', () => assert.equal(normalizeAudioInputDevices([{ kind: 'audioinput', deviceId: 'a', label: 'A' }, { kind: 'audioinput', deviceId: 'a', label: 'A2' }]).length, 1))
test('selected device uses exact constraints', () => assert.deepEqual(audioInputConstraints('camera'), { deviceId: { exact: 'camera' } }))
test('default device uses browser default constraints', () => assert.equal(audioInputConstraints(), true))
test('device switch cleanup stops every old track', () => { let stopped = 0; stopMediaStream({ getTracks: () => [{ stop: () => stopped++ }, { stop: () => stopped++ }] } as unknown as MediaStream); assert.equal(stopped, 2) })
test('NO_SIGNAL handles absent samples', () => assert.equal(deriveMicInputState(measurement({ rmsDbfs: null, peakDbfs: null, activeDurationMs: 0 })), 'NO_SIGNAL'))
test('NO_SIGNAL handles the measured USB silence range', () => assert.equal(deriveMicInputState(measurement({ rmsDbfs: -98.28, peakDbfs: -78.27, activeDurationMs: 0 })), 'NO_SIGNAL'))
test('LOW_SIGNAL preserves uncertain quiet input', () => assert.equal(deriveMicInputState(measurement({ rmsDbfs: -62, peakDbfs: -48, activeDurationMs: 500 })), 'LOW_SIGNAL'))
test('LOW_SIGNAL does not promote a brief peak', () => assert.equal(deriveMicInputState(measurement({ rmsDbfs: -50, peakDbfs: -25, activeDurationMs: 200 })), 'LOW_SIGNAL'))
test('USABLE_SIGNAL accepts the measured webcam range', () => assert.equal(deriveMicInputState(measurement({ rmsDbfs: -35.51, peakDbfs: -8.35, activeDurationMs: 3100 })), 'USABLE_SIGNAL'))
test('NO_SIGNAL blocks start', () => assert.equal(canStartAfterMicCheck('NO_SIGNAL'), false))
test('LOW_SIGNAL warns and blocks by default', () => assert.equal(canStartAfterMicCheck('LOW_SIGNAL'), false))
test('LOW_SIGNAL explicit escape enables start', () => assert.equal(canStartAfterMicCheck('LOW_SIGNAL', true), true))
test('usable input enables start', () => assert.equal(canStartAfterMicCheck('USABLE_SIGNAL'), true))
test('frame summary calculates active duration without storing audio', () => { const result = summarizeMicFrames([frame(.01), frame(.01), frame(0)], 100); assert.equal(result.activeDurationMs, 200); assert.equal(result.durationMs, 300) })
test('empty frame summary remains fail-closed', () => assert.deepEqual(summarizeMicFrames([], 100), { rmsDbfs: null, peakDbfs: null, activeDurationMs: 0, durationMs: 0 }))
test('mic check UI exposes current device, selector and live status', () => { assert.match(componentSource, /현재 마이크/); assert.match(componentSource, /마이크 선택/); assert.match(componentSource, /aria-live="polite"/) })
test('selected device propagates through the same stream to interview recording', () => { assert.match(interviewSource, /const \{status:micStatus,stream\}=mic/); assert.match(interviewSource, /new MediaRecorder\(stream\)/) })
test('mock session caches one successful initial mic check by session id', () => { assert.match(homeSource, /micSessionKey=\{mockSession\?\.id\}/); assert.match(hookSource, /sessionMicChecks\.get\(sessionKey\)/) })
test('self introduction reuses Mic Check V2 and the selected stream', () => { assert.match(selfIntroSource, /useMicrophoneCheck\(\)/); assert.match(selfIntroSource, /new MediaRecorder\(stream\)/) })
test('device loss, cleanup, privacy and accessibility contracts stay explicit', () => { assert.match(hookSource, /addEventListener\('ended'/); assert.match(hookSource, /addEventListener\('mute'/); assert.match(hookSource, /stopMediaStream\(streamRef\.current\)/); assert.doesNotMatch(hookSource, /transcrib|localStorage|fetch\(/); assert.match(componentSource, /min-h-11/) })
