import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

class MockWebSocket {
  static instances: MockWebSocket[] = []

  url: string
  readyState = 1
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = 3
    this.onclose?.({ type: 'close' } as CloseEvent)
  })

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    queueMicrotask(() => {
      this.onopen?.(new Event('open'))
    })
  }
}

Object.defineProperty(globalThis, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
})

Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  configurable: true,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  MockWebSocket.instances.length = 0
})
