import { amplitudeToDbfs, calculatePeak, calculateRms } from './audio-analysis'

export type MicInputState = 'NO_SIGNAL' | 'LOW_SIGNAL' | 'USABLE_SIGNAL'

export type MicInputMeasurement = {
  rmsDbfs: number | null
  peakDbfs: number | null
  activeDurationMs: number
  durationMs: number
}

export type MicrophoneDevice = { deviceId: string; label: string }

export const MIC_CHECK_SAMPLE_MS = 4000
export const MIC_CHECK_ACTIVE_DBFS = -55

export function deriveMicInputState(measurement: MicInputMeasurement): MicInputState {
  const { rmsDbfs, peakDbfs, activeDurationMs } = measurement
  if (peakDbfs === null || peakDbfs < -70 || (activeDurationMs < 200 && (rmsDbfs === null || rmsDbfs < -65))) return 'NO_SIGNAL'
  if (rmsDbfs !== null && rmsDbfs >= -55 && peakDbfs >= -45 && activeDurationMs >= 800) return 'USABLE_SIGNAL'
  return 'LOW_SIGNAL'
}

export function canStartAfterMicCheck(state?: MicInputState, lowSignalOverride = false) {
  return state === 'USABLE_SIGNAL' || (state === 'LOW_SIGNAL' && lowSignalOverride)
}

export function audioInputConstraints(deviceId?: string): MediaTrackConstraints | boolean {
  return deviceId ? { deviceId: { exact: deviceId } } : true
}

export function normalizeAudioInputDevices(devices: Pick<MediaDeviceInfo, 'kind' | 'deviceId' | 'label'>[]): MicrophoneDevice[] {
  return devices
    .filter(device => device.kind === 'audioinput' && Boolean(device.deviceId))
    .map((device, index) => ({ deviceId: device.deviceId, label: device.label.trim() || `마이크 ${index + 1}` }))
    .filter((device, index, list) => list.findIndex(item => item.deviceId === device.deviceId) === index)
}

export function stopMediaStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop())
}

export function summarizeMicFrames(frames: ArrayLike<number>[], intervalMs: number): MicInputMeasurement {
  if (!frames.length) return { rmsDbfs: null, peakDbfs: null, activeDurationMs: 0, durationMs: 0 }
  const rmsValues = Array.from(frames, frame => calculateRms(frame))
  const peakValues = Array.from(frames, frame => calculatePeak(frame))
  const averageRms = Math.sqrt(rmsValues.reduce((sum, value) => sum + value * value, 0) / rmsValues.length)
  const activeDurationMs = rmsValues.filter(value => (amplitudeToDbfs(value) ?? -Infinity) >= MIC_CHECK_ACTIVE_DBFS).length * intervalMs
  return {
    rmsDbfs: amplitudeToDbfs(averageRms),
    peakDbfs: amplitudeToDbfs(Math.max(...peakValues)),
    activeDurationMs,
    durationMs: frames.length * intervalMs,
  }
}
