'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MIC_CHECK_SAMPLE_MS,
  audioInputConstraints,
  canStartAfterMicCheck,
  deriveMicInputState,
  normalizeAudioInputDevices,
  stopMediaStream,
  summarizeMicFrames,
  type MicrophoneDevice,
  type MicInputMeasurement,
  type MicInputState,
} from '@/lib/interview-audio/mic-check'

export type MicrophonePermissionState = 'checking' | 'ready' | 'denied' | 'mock'

type CachedMicCheck = { deviceId?: string; state: MicInputState; measurement: MicInputMeasurement; stream: MediaStream; deviceLabel: string }
const sessionMicChecks = new Map<string, CachedMicCheck>()

export function releaseMicrophoneCheckSession(sessionKey?: string) {
  if (!sessionKey) return
  stopMediaStream(sessionMicChecks.get(sessionKey)?.stream)
  sessionMicChecks.delete(sessionKey)
}

export function useMicrophoneCheck(sessionKey?: string) {
  const initialCache = useRef(sessionKey ? sessionMicChecks.get(sessionKey) : undefined)
  const cachedStream = initialCache.current?.stream.getAudioTracks()[0]?.readyState === 'live' ? initialCache.current.stream : null
  const [status, setStatus] = useState<MicrophonePermissionState>(cachedStream ? 'ready' : 'checking')
  const [stream, setStream] = useState<MediaStream | null>(cachedStream)
  const streamRef = useRef<MediaStream | null>(cachedStream)
  const [devices, setDevices] = useState<MicrophoneDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(initialCache.current?.deviceId)
  const [deviceLabel, setDeviceLabel] = useState(initialCache.current?.deviceLabel || '기본 마이크')
  const [signalState, setSignalState] = useState<MicInputState | undefined>(initialCache.current?.state)
  const [measurement, setMeasurement] = useState<MicInputMeasurement | undefined>(initialCache.current?.measurement)
  const [level, setLevel] = useState(cachedStream ? 72 : 0)
  const [sampling, setSampling] = useState(false)
  const [lowSignalOverride, setLowSignalOverride] = useState(false)
  const samplerCleanup = useRef<(() => void) | null>(null)
  const trackListenerCleanup = useRef<(() => void) | null>(null)
  const requestSequence = useRef(0)

  const cleanupSampler = useCallback(() => {
    samplerCleanup.current?.()
    samplerCleanup.current = null
    setSampling(false)
  }, [])

  const bindTrackLoss = useCallback((track: MediaStreamTrack) => {
    trackListenerCleanup.current?.()
    const handleLoss = () => {
      cleanupSampler()
      setSignalState('NO_SIGNAL')
      setStatus('denied')
      if (sessionKey) sessionMicChecks.delete(sessionKey)
    }
    track.addEventListener('ended', handleLoss)
    track.addEventListener('mute', handleLoss)
    trackListenerCleanup.current = () => {
      track.removeEventListener('ended', handleLoss)
      track.removeEventListener('mute', handleLoss)
    }
  }, [cleanupSampler, sessionKey])

  useEffect(() => {
    const track = cachedStream?.getAudioTracks()[0]
    if (track) bindTrackLoss(track)
  }, [bindTrackLoss, cachedStream])

  const sample = useCallback((nextStream: MediaStream, cacheDeviceId?: string) => {
    cleanupSampler()
    setSignalState(undefined)
    setMeasurement(undefined)
    setLowSignalOverride(false)
    setSampling(true)
    setLevel(0)
    let context: AudioContext | undefined
    let analyser: AnalyserNode | undefined
    let source: MediaStreamAudioSourceNode | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    let finished = false
    const frames: Float32Array[] = []
    const intervalMs = 100
    const teardown = () => {
      if (timer) clearInterval(timer)
      try { source?.disconnect(); analyser?.disconnect(); void context?.close() } catch { /* best-effort browser cleanup */ }
      samplerCleanup.current = null
    }
    const finish = () => {
      if (finished) return
      finished = true
      teardown()
      const nextMeasurement = summarizeMicFrames(frames, intervalMs)
      const nextState = deriveMicInputState(nextMeasurement)
      setMeasurement(nextMeasurement)
      setSignalState(nextState)
      setSampling(false)
      if (sessionKey && nextState === 'USABLE_SIGNAL') sessionMicChecks.set(sessionKey, { deviceId: cacheDeviceId, state: nextState, measurement: nextMeasurement, stream: nextStream, deviceLabel: nextStream.getAudioTracks()[0]?.label || '기본 마이크' })
    }
    try {
      context = new AudioContext()
      analyser = context.createAnalyser()
      analyser.fftSize = 2048
      source = context.createMediaStreamSource(nextStream)
      source.connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      timer = setInterval(() => {
        analyser?.getFloatTimeDomainData(buffer)
        frames.push(new Float32Array(buffer))
        const peak = Math.max(...Array.from(buffer, Math.abs))
        setLevel(Math.min(100, Math.max(2, Math.round(peak * 220))))
        if (frames.length * intervalMs >= MIC_CHECK_SAMPLE_MS) finish()
      }, intervalMs)
      samplerCleanup.current = () => { finished = true; teardown() }
    } catch {
      finish()
    }
  }, [cleanupSampler, sessionKey])

  const check = useCallback(async (deviceId?: string, forceSample = false) => {
    const sequence = ++requestSequence.current
    cleanupSampler()
    setStatus('checking')
    setSignalState(undefined)
    setLowSignalOverride(false)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('mock')
      return
    }
    stopMediaStream(streamRef.current)
    streamRef.current = null
    setStream(null)
    try {
      const cached = sessionKey ? sessionMicChecks.get(sessionKey) : undefined
      const requestedDeviceId = deviceId || cached?.deviceId
      let timeout: ReturnType<typeof setTimeout> | undefined
      const nextStream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: audioInputConstraints(requestedDeviceId) }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Microphone permission timeout')), 5000) }),
      ]).finally(() => { if (timeout) clearTimeout(timeout) })
      if (sequence !== requestSequence.current) { stopMediaStream(nextStream); return }
      const track = nextStream.getAudioTracks()[0]
      if (!track) { stopMediaStream(nextStream); setStatus('denied'); return }
      const actualDeviceId = track.getSettings().deviceId || requestedDeviceId
      bindTrackLoss(track)
      streamRef.current = nextStream
      setStream(nextStream)
      setDeviceLabel(track.label || '기본 마이크')
      setSelectedDeviceId(actualDeviceId)
      setStatus('ready')
      try {
        const inputs = normalizeAudioInputDevices(await navigator.mediaDevices.enumerateDevices())
        setDevices(inputs)
      } catch { setDevices([]) }
      if (!forceSample && cached?.state === 'USABLE_SIGNAL' && (!cached.deviceId || cached.deviceId === actualDeviceId)) {
        setMeasurement(cached.measurement)
        setSignalState(cached.state)
        setLevel(72)
        if (sessionKey) sessionMicChecks.set(sessionKey, { ...cached, deviceId: actualDeviceId, stream: nextStream, deviceLabel: track.label || cached.deviceLabel })
      } else sample(nextStream, actualDeviceId)
    } catch {
      if (sequence === requestSequence.current) setStatus('denied')
    }
  }, [bindTrackLoss, cleanupSampler, sample, sessionKey])

  useEffect(() => () => {
    requestSequence.current += 1
    samplerCleanup.current?.()
    trackListenerCleanup.current?.()
    const cached = sessionKey ? sessionMicChecks.get(sessionKey) : undefined
    if (!cached || cached.stream !== streamRef.current) stopMediaStream(streamRef.current)
  }, [sessionKey])

  return {
    status, stream, devices, selectedDeviceId, deviceLabel, signalState, measurement, level, sampling,
    lowSignalOverride,
    sessionReady: Boolean(cachedStream && initialCache.current?.state === 'USABLE_SIGNAL'),
    canStart: canStartAfterMicCheck(signalState, lowSignalOverride),
    check,
    retest: () => streamRef.current ? sample(streamRef.current, selectedDeviceId) : void check(selectedDeviceId, true),
    selectDevice: (deviceId: string) => void check(deviceId, true),
    continueWithLowSignal: () => setLowSignalOverride(true),
  }
}
