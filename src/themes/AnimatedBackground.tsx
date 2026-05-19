import { useEffect, useRef } from 'react'
import { useAppStore } from '@store/useAppStore'

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnimatedBackground() {
  const { animationsEnabled, settings } = useAppStore()

  if (!animationsEnabled || settings.animationTheme === 'none') return null

  return (
    <div style={{
      position:      'fixed',
      inset:         0,
      pointerEvents: 'none',
      zIndex:        0,
      overflow:      'hidden',
    }}>
      {settings.animationTheme === 'particles'   && <ParticlesCanvas   />}
      {settings.animationTheme === 'bubbles'     && <BubblesCanvas     />}
      {settings.animationTheme === 'butterflies' && <ButterfliesCanvas />}
      {settings.animationTheme === 'ocean'       && <OceanCanvas       />}
      {settings.animationTheme === 'stars'       && <StarsCanvas       />}
      {settings.animationTheme === 'aurora'      && <AuroraCanvas      />}
      {settings.animationTheme === 'fireflies'   && <FirefliesCanvas   />}
      {settings.animationTheme === 'rain_light'  && <RainCanvas mode="light" />}
      {settings.animationTheme === 'rain_storm'  && <RainCanvas mode="storm" />}
      {settings.animationTheme === 'rain_fog'    && <RainCanvas mode="fog"   />}
      {settings.animationTheme === 'snow'        && <SnowCanvas        />}
      {settings.animationTheme === 'fog'         && <FogCanvas         />}
      {settings.animationTheme === 'lightning'   && <LightningCanvas   />}
      {settings.animationTheme === 'sandstorm'   && <SandstormCanvas   />}
    </div>
  )
}

// ─── Canvas base style ────────────────────────────────────────────────────────

const BASE: React.CSSProperties = {
  position:      'absolute',
  inset:         0,
  width:         '100%',
  height:        '100%',
  pointerEvents: 'none',
}

// ═════════════════════════════════════════════════════════════════════════════
//  1. PARTICLES — Website-style interactive stars + connections
// ═════════════════════════════════════════════════════════════════════════════

function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const mouseRef  = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    // Mouse repulsion
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMouse)

    // ── Particles ────────────────────────────────────────────────────────────
    const COLORS = [
      '#6366f1','#818cf8','#a78bfa',
      '#ec4899','#f472b6','#60a5fa',
      '#34d399','#fbbf24','#c084fc',
    ]

    interface P {
      x: number; y: number
      ox: number; oy: number   // origin
      vx: number; vy: number
      r: number
      color: string
      alpha: number
      twinkle: number
      twinkleSpeed: number
      // Star shape
      isStar: boolean
      rotation: number
      rotSpeed: number
    }

    const COUNT = 90
    const pts: P[] = Array.from({ length: COUNT }, () => {
      const isStar = Math.random() < 0.3
      return {
        x:           Math.random() * W,
        y:           Math.random() * H,
        ox:          0, oy: 0,
        vx:          (Math.random() - 0.5) * 0.5,
        vy:          (Math.random() - 0.5) * 0.5,
        r:           isStar ? Math.random() * 4 + 2 : Math.random() * 3 + 0.8,
        color:       COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha:       Math.random() * 0.6 + 0.3,
        twinkle:     Math.random() * Math.PI * 2,
        twinkleSpeed:Math.random() * 0.04 + 0.01,
        isStar,
        rotation:    Math.random() * Math.PI * 2,
        rotSpeed:    (Math.random() - 0.5) * 0.02,
      }
    })

    // Draw star shape
    const drawStar = (
      ctx: CanvasRenderingContext2D,
      x: number, y: number,
      r: number, points: number,
      rotation: number,
      color: string, alpha: number
    ) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.beginPath()
      for (let i = 0; i < points * 2; i++) {
        const angle  = (i * Math.PI) / points
        const radius = i % 2 === 0 ? r : r * 0.4
        if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
        else         ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
      }
      ctx.closePath()

      // Glow
      ctx.shadowBlur  = 10
      ctx.shadowColor = color
      ctx.fillStyle   = color
      ctx.globalAlpha = alpha
      ctx.fill()
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    const MAX_DIST = 130

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      // Update
      for (const p of pts) {
        p.x       += p.vx
        p.y       += p.vy
        p.twinkle += p.twinkleSpeed
        p.rotation+= p.rotSpeed

        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1

        // Mouse repulsion
        const dx   = p.x - mx
        const dy   = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          p.x += (dx / dist) * 1.5
          p.y += (dy / dist) * 1.5
        }

        // Twinkling alpha
        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.twinkle))

        if (p.isStar) {
          drawStar(ctx, p.x, p.y, p.r, 4, p.rotation, p.color, a)
        } else {
          // Glowing circle
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2)
          grad.addColorStop(0, `${p.color}ff`)
          grad.addColorStop(0.5, `${p.color}88`)
          grad.addColorStop(1, `${p.color}00`)

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fillStyle   = p.color
          ctx.globalAlpha = a
          ctx.shadowBlur  = 8
          ctx.shadowColor = p.color
          ctx.fill()
          ctx.shadowBlur  = 0
          ctx.globalAlpha = 1
        }
      }

      // Connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a   = pts[i], b = pts[j]
          const dx  = a.x - b.x, dy = a.y - b.y
          const d   = Math.sqrt(dx * dx + dy * dy)
          if (d < MAX_DIST) {
            const alpha = (1 - d / MAX_DIST) * 0.35
            const grad  = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
            grad.addColorStop(0, a.color)
            grad.addColorStop(1, b.color)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = grad
            ctx.globalAlpha = alpha
            ctx.lineWidth   = 0.8
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  2. BUBBLES — Vibrant 3D soap bubbles
// ═════════════════════════════════════════════════════════════════════════════

function BubblesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface Bubble {
      x: number; y: number; r: number
      vx: number; vy: number
      hue: number; sat: number; lit: number
      alpha: number
      wobble: number; wobbleSpeed: number; wobbleAmp: number
      popTimer: number
      phase: 'rising' | 'popping'
      popFrame: number
    }

    const PALETTES = [
      [280, 85, 70], [210, 90, 65], [160, 80, 60],
      [330, 85, 65], [50,  85, 60], [190, 85, 65],
    ]

    const makeBubble = (startY?: number): Bubble => {
      const [h, s, l] = PALETTES[Math.floor(Math.random() * PALETTES.length)]
      return {
        x:          Math.random() * W,
        y:          startY ?? H + 40,
        r:          Math.random() * 40 + 8,
        vx:         (Math.random() - 0.5) * 0.4,
        vy:         -(Math.random() * 0.8 + 0.3),
        hue:        h + (Math.random() * 30 - 15),
        sat:        s,
        lit:        l,
        alpha:      Math.random() * 0.45 + 0.3,
        wobble:     Math.random() * Math.PI * 2,
        wobbleSpeed:Math.random() * 0.03 + 0.01,
        wobbleAmp:  Math.random() * 2 + 0.5,
        popTimer:   Math.random() * 600 + 200,
        phase:      'rising',
        popFrame:   0,
      }
    }

    const COUNT   = 22
    const bubbles = Array.from({ length: COUNT }, () =>
      makeBubble(Math.random() * H)
    )

    const drawBubble = (b: Bubble) => {
      const { x, y, r, hue, sat, lit, alpha } = b

      // Main body gradient
      const grad = ctx.createRadialGradient(
        x - r * 0.3, y - r * 0.35, r * 0.05,
        x, y, r
      )
      grad.addColorStop(0,   `hsla(${hue}, ${sat}%, 95%, ${alpha * 0.6})`)
      grad.addColorStop(0.3, `hsla(${hue}, ${sat}%, ${lit + 15}%, ${alpha * 0.5})`)
      grad.addColorStop(0.7, `hsla(${hue}, ${sat}%, ${lit}%, ${alpha * 0.4})`)
      grad.addColorStop(1,   `hsla(${hue}, ${sat}%, ${lit - 10}%, ${alpha * 0.2})`)

      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Rainbow rim
      const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
      rim.addColorStop(0,    `hsla(${hue},      ${sat}%, 80%, ${alpha * 0.9})`)
      rim.addColorStop(0.25, `hsla(${hue + 60}, ${sat}%, 75%, ${alpha * 0.7})`)
      rim.addColorStop(0.5,  `hsla(${hue + 120},${sat}%, 70%, ${alpha * 0.8})`)
      rim.addColorStop(0.75, `hsla(${hue + 200},${sat}%, 75%, ${alpha * 0.7})`)
      rim.addColorStop(1,    `hsla(${hue + 300},${sat}%, 80%, ${alpha * 0.9})`)

      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.strokeStyle = rim
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Top-left shine
      const shine1 = ctx.createRadialGradient(
        x - r * 0.3, y - r * 0.35, 0,
        x - r * 0.3, y - r * 0.35, r * 0.4
      )
      shine1.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`)
      shine1.addColorStop(1, `rgba(255,255,255,0)`)

      ctx.beginPath()
      ctx.ellipse(x - r * 0.28, y - r * 0.28, r * 0.22, r * 0.14, -Math.PI / 4, 0, Math.PI * 2)
      ctx.fillStyle = shine1
      ctx.fill()

      // Bottom-right secondary shine
      ctx.beginPath()
      ctx.ellipse(x + r * 0.22, y + r * 0.24, r * 0.1, r * 0.06, Math.PI / 4, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`
      ctx.fill()
    }

    const drawPop = (b: Bubble) => {
      const progress = b.popFrame / 12
      const rExpand  = b.r * (1 + progress * 0.5)
      const alpha    = (1 - progress) * b.alpha * 0.7

      ctx.beginPath()
      ctx.arc(b.x, b.y, rExpand, 0, Math.PI * 2)
      ctx.strokeStyle = `hsla(${b.hue}, ${b.sat}%, ${b.lit}%, ${alpha})`
      ctx.lineWidth   = 2 * (1 - progress)
      ctx.stroke()

      // Pop sparkles
      const sparks = 8
      for (let i = 0; i < sparks; i++) {
        const angle = (i / sparks) * Math.PI * 2
        const dist  = b.r * (0.8 + progress * 1.2)
        const sx    = b.x + Math.cos(angle) * dist
        const sy    = b.y + Math.sin(angle) * dist
        ctx.beginPath()
        ctx.arc(sx, sy, 2 * (1 - progress), 0, Math.PI * 2)
        ctx.fillStyle   = `hsla(${b.hue + i * 20}, ${b.sat}%, ${b.lit + 10}%, ${alpha})`
        ctx.fill()
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i]

        if (b.phase === 'popping') {
          drawPop(b)
          b.popFrame++
          if (b.popFrame > 12) bubbles[i] = makeBubble()
          continue
        }

        b.y       += b.vy
        b.wobble  += b.wobbleSpeed
        b.x       += b.vx + Math.sin(b.wobble) * b.wobbleAmp
        b.popTimer--

        if (b.y + b.r < -20 || b.popTimer <= 0) {
          b.phase    = 'popping'
          b.popFrame = 0
          continue
        }

        drawBubble(b)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  3. BUTTERFLIES — Modern colorful morpho butterflies
// ═════════════════════════════════════════════════════════════════════════════

function ButterfliesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface Butterfly {
      x: number; y: number
      targetX: number; targetY: number
      speed: number
      wingT: number; wingSpeed: number
      size: number
      hue1: number; hue2: number
      alpha: number
      wanderT: number
      phase: 'flying' | 'landing' | 'resting'
      restTimer: number
      trail: Array<{ x: number; y: number; a: number }>
    }

    const PALETTES: [number, number][] = [
      [280, 320], // purple-pink (morpho)
      [200, 240], // blue-indigo
      [160, 200], // teal-blue
      [320, 360], // pink-red
      [40,  80],  // golden-orange
      [100, 140], // green-teal
    ]

    const makeButterfly = (): Butterfly => {
      const [h1, h2] = PALETTES[Math.floor(Math.random() * PALETTES.length)]
      return {
        x:          Math.random() * W,
        y:          Math.random() * H,
        targetX:    Math.random() * W,
        targetY:    Math.random() * H,
        speed:      Math.random() * 1.2 + 0.5,
        wingT:      Math.random() * Math.PI * 2,
        wingSpeed:  Math.random() * 0.14 + 0.07,
        size:       Math.random() * 22 + 12,
        hue1:       h1,
        hue2:       h2,
        alpha:      Math.random() * 0.5 + 0.4,
        wanderT:    Math.random() * 100,
        phase:      'flying',
        restTimer:  0,
        trail:      [],
      }
    }

    const COUNT       = 10
    const butterflies = Array.from({ length: COUNT }, makeButterfly)

    const drawWing = (
      cx: number, cy: number,
      size: number, flip: boolean,
      wingAngle: number,
      hue1: number, hue2: number,
      alpha: number
    ) => {
      const dir    = flip ? -1 : 1
      const scaleX = Math.abs(Math.cos(wingAngle))

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(dir * scaleX, 1)

      // Upper wing — large and colorful
      const g1 = ctx.createRadialGradient(size * 0.2, -size * 0.3, 0, size * 0.4, -size * 0.2, size)
      g1.addColorStop(0,   `hsla(${hue1}, 95%, 85%, ${alpha})`)
      g1.addColorStop(0.3, `hsla(${hue1 + 20}, 90%, 70%, ${alpha * 0.9})`)
      g1.addColorStop(0.7, `hsla(${hue2}, 85%, 55%, ${alpha * 0.75})`)
      g1.addColorStop(1,   `hsla(${hue2 + 20}, 80%, 40%, ${alpha * 0.5})`)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(
        size * 0.15, -size * 1.1,
        size * 1.1,  -size * 0.8,
        size * 0.95,  size * 0.1
      )
      ctx.bezierCurveTo(size * 0.7, size * 0.4, size * 0.1, size * 0.15, 0, 0)
      ctx.fillStyle = g1

      // Wing pattern overlay
      ctx.shadowBlur  = 8
      ctx.shadowColor = `hsla(${hue1}, 100%, 70%, 0.4)`
      ctx.fill()
      ctx.shadowBlur  = 0

      ctx.strokeStyle = `hsla(${hue2}, 70%, 35%, ${alpha * 0.6})`
      ctx.lineWidth   = 0.7
      ctx.stroke()

      // Wing venation lines
      ctx.strokeStyle = `hsla(${hue2 + 40}, 60%, 30%, ${alpha * 0.25})`
      ctx.lineWidth   = 0.5
      for (let v = 0; v < 4; v++) {
        const t = v / 4
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.quadraticCurveTo(
          size * (0.3 + t * 0.4), -size * (0.5 + t * 0.3),
          size * (0.5 + t * 0.3), -size * (0.1 - t * 0.1)
        )
        ctx.stroke()
      }

      // Eyespot decoration
      ctx.beginPath()
      ctx.arc(size * 0.5, -size * 0.15, size * 0.09, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue2 + 60}, 90%, 30%, ${alpha * 0.7})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(size * 0.5, -size * 0.15, size * 0.05, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`
      ctx.fill()

      // Lower wing
      const g2 = ctx.createRadialGradient(size * 0.1, size * 0.4, 0, size * 0.3, size * 0.4, size * 0.8)
      g2.addColorStop(0,   `hsla(${hue2}, 90%, 75%, ${alpha * 0.9})`)
      g2.addColorStop(0.5, `hsla(${hue2 + 30}, 85%, 60%, ${alpha * 0.7})`)
      g2.addColorStop(1,   `hsla(${hue1 + 40}, 80%, 45%, ${alpha * 0.4})`)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(
        size * 0.1,  size * 0.65,
        size * 0.9,  size * 0.85,
        size * 0.75, size * 0.2
      )
      ctx.bezierCurveTo(size * 0.5, size * 0.08, size * 0.1, size * 0.25, 0, 0)
      ctx.fillStyle = g2
      ctx.fill()
      ctx.strokeStyle = `hsla(${hue2}, 65%, 35%, ${alpha * 0.5})`
      ctx.stroke()

      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      for (const b of butterflies) {
        // Trail
        b.trail.push({ x: b.x, y: b.y, a: b.alpha * 0.3 })
        if (b.trail.length > 8) b.trail.shift()

        for (let t = 0; t < b.trail.length; t++) {
          const tr    = b.trail[t]
          const prog  = t / b.trail.length
          ctx.beginPath()
          ctx.arc(tr.x, tr.y, b.size * 0.05 * prog, 0, Math.PI * 2)
          ctx.fillStyle   = `hsla(${b.hue1}, 80%, 70%, ${tr.a * prog * 0.4})`
          ctx.fill()
        }

        // Movement
        if (b.phase === 'flying') {
          const dx   = b.targetX - b.x
          const dy   = b.targetY - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 40) {
            b.targetX = Math.random() * W
            b.targetY = Math.random() * H
            if (Math.random() < 0.15) {
              b.phase     = 'resting'
              b.restTimer = Math.random() * 120 + 60
            }
          }

          b.x += (dx / dist) * b.speed
          b.y += (dy / dist) * b.speed
          b.wanderT += 0.01
          b.x += Math.sin(b.wanderT * 2.1) * 0.5
          b.y += Math.cos(b.wanderT * 1.6) * 0.4
          b.wingT += b.wingSpeed
        } else {
          b.restTimer--
          b.wingT += b.wingSpeed * 0.15 // Slow wing while resting
          if (b.restTimer <= 0) b.phase = 'flying'
        }

        const wingAngle = b.phase === 'resting'
          ? Math.sin(b.wingT) * 0.3
          : Math.sin(b.wingT) * 1.0

        drawWing(b.x, b.y, b.size, false, wingAngle, b.hue1, b.hue2, b.alpha)
        drawWing(b.x, b.y, b.size, true,  wingAngle, b.hue1, b.hue2, b.alpha)

        // Body
        ctx.beginPath()
        ctx.ellipse(b.x, b.y, b.size * 0.055, b.size * 0.38, 0, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${b.hue2 + 60}, 50%, 20%, ${b.alpha * 0.9})`
        ctx.fill()

        // Antennae
        ctx.strokeStyle = `hsla(${b.hue2 + 60}, 50%, 25%, ${b.alpha * 0.7})`
        ctx.lineWidth   = 0.8
        for (const ox of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(b.x, b.y - b.size * 0.3)
          ctx.quadraticCurveTo(
            b.x + ox * b.size * 0.2, b.y - b.size * 0.75,
            b.x + ox * b.size * 0.15, b.y - b.size * 0.88
          )
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(b.x + ox * b.size * 0.15, b.y - b.size * 0.88, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${b.hue1}, 80%, 60%, ${b.alpha})`
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. OCEAN — Vibrant fish + coral + light rays + bubbles
// ═════════════════════════════════════════════════════════════════════════════

function OceanCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    // ── Fish ─────────────────────────────────────────────────────────────────
    interface Fish {
      x: number; y: number; vx: number
      size: number
      hue: number; accent: number
      alpha: number
      tailT: number; tailSpeed: number
      waveT: number; waveAmp: number; waveSpeed: number
      stripes: boolean
      pattern: number
    }

    const FISH_PALETTES = [
      [15, 45],   // orange-gold (clownfish feel)
      [200, 220], // blue-cyan
      [280, 310], // purple
      [160, 190], // teal-green
      [330, 350], // magenta
      [40, 60],   // yellow
    ]

    const makeFish = (fromRight = false): Fish => {
      const [h, a] = FISH_PALETTES[Math.floor(Math.random() * FISH_PALETTES.length)]
      const size   = Math.random() * 28 + 10
      return {
        x:         fromRight ? W + size : -size,
        y:         Math.random() * H * 0.9 + H * 0.05,
        vx:        (Math.random() * 0.9 + 0.4) * (fromRight ? -1 : 1),
        size,
        hue:       h,
        accent:    a,
        alpha:     Math.random() * 0.55 + 0.4,
        tailT:     Math.random() * Math.PI * 2,
        tailSpeed: Math.random() * 0.14 + 0.06,
        waveT:     Math.random() * Math.PI * 2,
        waveAmp:   Math.random() * 18 + 5,
        waveSpeed: Math.random() * 0.018 + 0.006,
        stripes:   Math.random() < 0.4,
        pattern:   Math.floor(Math.random() * 3),
      }
    }

    const FISH_COUNT = 16
    const fishes: Fish[] = [
      ...Array.from({ length: Math.ceil(FISH_COUNT / 2) }, () => makeFish(false)),
      ...Array.from({ length: Math.floor(FISH_COUNT / 2)}, () => makeFish(true)),
    ]

    const drawFish = (f: Fish) => {
      const dir      = f.vx > 0 ? 1 : -1
      const tailSwing= Math.sin(f.tailT) * 0.45
      const { x, y, size, hue, accent, alpha } = f

      ctx.save()
      ctx.translate(x, y)
      ctx.scale(dir, 1)

      // Body
      const bodyG = ctx.createLinearGradient(-size, 0, size * 0.7, 0)
      bodyG.addColorStop(0,   `hsla(${hue + 10}, 85%, 55%, ${alpha * 0.7})`)
      bodyG.addColorStop(0.4, `hsla(${hue},      90%, 65%, ${alpha})`)
      bodyG.addColorStop(0.8, `hsla(${hue - 5},  85%, 55%, ${alpha * 0.85})`)
      bodyG.addColorStop(1,   `hsla(${hue - 10}, 80%, 45%, ${alpha * 0.6})`)

      ctx.beginPath()
      ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI * 2)
      ctx.fillStyle   = bodyG
      ctx.shadowBlur  = 12
      ctx.shadowColor = `hsla(${hue}, 90%, 60%, 0.3)`
      ctx.fill()
      ctx.shadowBlur  = 0

      // Stripes
      if (f.stripes) {
        for (let s = -0.3; s <= 0.3; s += 0.25) {
          ctx.beginPath()
          ctx.ellipse(s * size * 0.6, 0, size * 0.06, size * 0.38, 0, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${accent}, 85%, 85%, ${alpha * 0.6})`
          ctx.fill()
        }
      }

      // Scales (subtle arcs)
      ctx.strokeStyle = `hsla(${hue}, 70%, 40%, ${alpha * 0.2})`
      ctx.lineWidth   = 0.5
      for (let s = -0.35; s <= 0.45; s += 0.2) {
        ctx.beginPath()
        ctx.arc(s * size, 0, size * 0.22, Math.PI * 0.6, Math.PI * 1.4)
        ctx.stroke()
      }

      // Tail
      ctx.save()
      ctx.translate(-size, 0)
      ctx.rotate(tailSwing)

      const tailG = ctx.createLinearGradient(0, 0, -size * 0.65, 0)
      tailG.addColorStop(0, `hsla(${hue}, 85%, 55%, ${alpha * 0.9})`)
      tailG.addColorStop(1, `hsla(${accent}, 80%, 65%, ${alpha * 0.4})`)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size * 0.65,  size * 0.5)
      ctx.lineTo(-size * 0.55,  0)
      ctx.lineTo(-size * 0.65, -size * 0.5)
      ctx.closePath()
      ctx.fillStyle = tailG
      ctx.fill()
      ctx.restore()

      // Dorsal fin
      const dorsalG = ctx.createLinearGradient(0, -size * 0.4, 0, -size * 0.85)
      dorsalG.addColorStop(0, `hsla(${accent}, 85%, 65%, ${alpha * 0.8})`)
      dorsalG.addColorStop(1, `hsla(${accent}, 80%, 55%, ${alpha * 0.3})`)

      ctx.beginPath()
      ctx.moveTo(-size * 0.15, -size * 0.4)
      ctx.quadraticCurveTo(size * 0.1, -size * 0.9, size * 0.38, -size * 0.4)
      ctx.closePath()
      ctx.fillStyle = dorsalG
      ctx.fill()

      // Pectoral fin
      ctx.beginPath()
      ctx.moveTo(size * 0.1,  0)
      ctx.quadraticCurveTo(size * 0.3,  size * 0.45, size * 0.5, size * 0.28)
      ctx.closePath()
      ctx.fillStyle = `hsla(${accent}, 80%, 70%, ${alpha * 0.65})`
      ctx.fill()

      // Eye
      ctx.beginPath()
      ctx.arc(size * 0.58, -size * 0.09, size * 0.1, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.fill()
      ctx.beginPath()
      ctx.arc(size * 0.6, -size * 0.09, size * 0.055, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.85})`
      ctx.fill()
      // Eye shine
      ctx.beginPath()
      ctx.arc(size * 0.57, -size * 0.12, size * 0.025, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`
      ctx.fill()

      ctx.restore()
    }

    // ── Seaweed ───────────────────────────────────────────────────────────────
    const WEED_COUNT = 10
    interface Weed {
      x: number; height: number
      hue: number; alpha: number
      sway: number; swaySpeed: number
      thickness: number
    }

    const weeds: Weed[] = Array.from({ length: WEED_COUNT }, () => ({
      x:         Math.random() * W,
      height:    Math.random() * 100 + 50,
      hue:       Math.random() * 50 + 100,
      alpha:     Math.random() * 0.35 + 0.2,
      sway:      Math.random() * Math.PI * 2,
      swaySpeed: Math.random() * 0.025 + 0.008,
      thickness: Math.random() * 5 + 2,
    }))

    const drawSeaweed = (w: Weed) => {
      const segs   = 8
      const segH   = w.height / segs
      const sway   = Math.sin(w.sway) * 12

      ctx.save()
      ctx.strokeStyle = `hsla(${w.hue}, 75%, 40%, ${w.alpha})`
      ctx.lineWidth   = w.thickness
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.shadowBlur  = 6
      ctx.shadowColor = `hsla(${w.hue}, 80%, 50%, 0.2)`

      ctx.beginPath()
      ctx.moveTo(w.x, H)

      for (let i = 1; i <= segs; i++) {
        const progress = i / segs
        const ox       = sway * progress * progress * Math.sin(progress * Math.PI)
        const cp1x     = w.x + ox * 0.5
        const cp1y     = H - segH * (i - 0.5)
        ctx.quadraticCurveTo(cp1x, cp1y, w.x + ox, H - segH * i)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    // ── Bubbles (ocean) ───────────────────────────────────────────────────────
    interface OBubble {
      x: number; y: number; r: number; vy: number; alpha: number
    }
    const obubbles: OBubble[] = Array.from({ length: 25 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 4 + 1,
      vy:    -(Math.random() * 0.4 + 0.1),
      alpha: Math.random() * 0.3 + 0.1,
    }))

    // ── Light rays ────────────────────────────────────────────────────────────
    const drawLightRays = (t: number) => {
      const RAY_COUNT = 5
      for (let i = 0; i < RAY_COUNT; i++) {
        const x      = (W / RAY_COUNT) * i + W / (RAY_COUNT * 2)
        const sway   = Math.sin(t * 0.0006 + i * 1.4) * 40
        const alpha  = 0.04 + Math.sin(t * 0.0004 + i * 0.8) * 0.025
        const width  = 30 + Math.sin(t * 0.0003 + i) * 15

        const rayG = ctx.createLinearGradient(x, 0, x + sway, H)
        rayG.addColorStop(0, `rgba(100,200,255,${alpha})`)
        rayG.addColorStop(0.4,`rgba(80,180,255,${alpha * 0.7})`)
        rayG.addColorStop(1, `rgba(60,160,255,0)`)

        ctx.beginPath()
        ctx.moveTo(x - width, 0)
        ctx.lineTo(x + sway + width, H)
        ctx.lineTo(x + sway - width, H)
        ctx.lineTo(x + width, 0)
        ctx.closePath()
        ctx.fillStyle = rayG
        ctx.fill()
      }
    }

    // ── Water surface ripple ──────────────────────────────────────────────────
    const drawWaterSurface = (t: number) => {
      const y = 18
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= W; x += 4) {
        const wave = Math.sin(x * 0.015 + t * 0.015) * 4
                   + Math.sin(x * 0.025 + t * 0.01) * 2
        ctx.lineTo(x, y + wave)
      }
      ctx.lineTo(W, 0)
      ctx.lineTo(0, 0)
      ctx.closePath()

      const surfG = ctx.createLinearGradient(0, 0, 0, y + 10)
      surfG.addColorStop(0, 'rgba(100,200,255,0.12)')
      surfG.addColorStop(1, 'rgba(100,200,255,0)')
      ctx.fillStyle = surfG
      ctx.fill()
    }

    let t = 0
    const draw = () => {
      t++
      ctx.clearRect(0, 0, W, H)

      drawLightRays(t)
      drawWaterSurface(t)

      for (const w of weeds) {
        w.sway += w.swaySpeed
        drawSeaweed(w)
      }

      for (const b of obubbles) {
        b.y += b.vy
        if (b.y + b.r < 0) { b.y = H + b.r; b.x = Math.random() * W }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(150,220,255,${b.alpha})`
        ctx.lineWidth   = 0.8
        ctx.stroke()
        // Tiny shine
        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.25, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${b.alpha * 0.8})`
        ctx.fill()
      }

      const sorted = [...fishes].sort((a, b) => b.size - a.size)
      for (let i = 0; i < fishes.length; i++) {
        const f = fishes[i]
        f.x   += f.vx
        f.tailT += f.tailSpeed
        f.waveT += f.waveSpeed
        f.y   += Math.sin(f.waveT) * 0.45

        if (f.vx > 0 && f.x - f.size > W) fishes[i] = makeFish(false)
        if (f.vx < 0 && f.x + f.size < 0) fishes[i] = makeFish(true)

        drawFish(f)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ ...BASE, opacity: 0.75 }} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  5. STARS — Realistic night sky with Milky Way galaxy band + twinkling stars
// ═════════════════════════════════════════════════════════════════════════════

function StarsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    // ─── STAR TYPES ───────────────────────────────────────────────────────────
    interface Star {
      x: number; y: number
      r: number
      alpha: number
      twinklePhase: number
      twinkleSpeed: number
      twinkleAmp: number
      color: string
      isBright: boolean
    }

    const STAR_COLORS = [
      'rgba(180,210,255,',
      'rgba(220,230,255,',
      'rgba(255,248,230,',
      'rgba(255,235,180,',
      'rgba(255,210,140,',
    ]

    const TOTAL_STARS = 320

    const stars: Star[] = Array.from({ length: TOTAL_STARS }, () => {
      const inBand = Math.random() < 0.45
      let sx: number, sy: number
      if (inBand) {
        const t      = Math.random()
        const cx     = W * (0.15 + t * 0.7)
        const cy     = H * (0.1  + t * 0.8)
        const spread = W * 0.18
        sx = cx + (Math.random() - 0.5) * spread
        sy = cy + (Math.random() - 0.5) * spread * 0.5
      } else {
        sx = Math.random() * W
        sy = Math.random() * H
      }

      const isBright = Math.random() < 0.06
      const r = isBright
        ? Math.random() * 1.6 + 1.0
        : Math.random() * 0.9 + 0.2

      return {
        x:            sx,
        y:            sy,
        r,
        alpha:        Math.random() * 0.55 + 0.35,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.025 + 0.005,
        twinkleAmp:   Math.random() * 0.55 + 0.2,
        color:        STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        isBright,
      }
    })

    // ─── METEOR TYPES ─────────────────────────────────────────────────────────
    interface Meteor {
      x: number; y: number
      vx: number; vy: number
      len: number
      alpha: number
      width: number
      hue: number
      active: boolean
      spawnTimer: number
      trail: Array<{ x: number; y: number }>
    }

    const MAX_METEORS = 5

    const spawnMeteor = (): Meteor => {
      const startX = Math.random() * W * 0.7
      const startY = Math.random() * H * 0.4
      const angle  = (Math.PI / 4) + (Math.random() - 0.5) * 0.4
      const speed  = Math.random() * 7 + 5
      return {
        x:          startX,
        y:          startY,
        vx:         Math.cos(angle) * speed,
        vy:         Math.sin(angle) * speed,
        len:        Math.random() * 120 + 60,
        alpha:      Math.random() * 0.6 + 0.4,
        width:      Math.random() * 1.8 + 0.6,
        hue:        Math.random() * 60 + 180,   // blue-white to white
        active:     true,
        spawnTimer: Math.random() * 180 + 60,
        trail:      [],
      }
    }

    // Stagger initial spawns so they don't all fire at once
    const meteors: Meteor[] = Array.from({ length: MAX_METEORS }, () => {
      const m      = spawnMeteor()
      m.active     = false
      m.spawnTimer = Math.random() * 300
      return m
    })

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    const drawMilkyWay = () => {
      const steps = 180
      for (let i = 0; i < steps; i++) {
        const t   = i / steps
        const cx  = W * (0.12 + t * 0.76)
        const cy  = H * (0.08 + t * 0.84)
        const bw  = (W * 0.13) * (0.5 + 0.5 * Math.sin(t * Math.PI))
        const bh  = bw * 0.28
        const alpha = 0.012 + 0.018 * Math.sin(t * Math.PI)
        const hue   = 210 + Math.sin(t * 3) * 20

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, bw)
        g.addColorStop(0,   `hsla(${hue}, 60%, 75%, ${alpha})`)
        g.addColorStop(0.5, `hsla(${hue}, 50%, 55%, ${alpha * 0.5})`)
        g.addColorStop(1,   `hsla(${hue}, 40%, 35%, 0)`)

        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, bh / bw)
        ctx.beginPath()
        ctx.arc(0, 0, bw, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
        ctx.restore()
      }
    }

    const drawSpike = (x: number, y: number, r: number, alpha: number, color: string) => {
      const len = r * 14
      ctx.save()
      ctx.globalAlpha = alpha * 0.55
      for (const angle of [0, Math.PI / 2]) {
        const grad = ctx.createLinearGradient(
          x - Math.cos(angle) * len, y - Math.sin(angle) * len,
          x + Math.cos(angle) * len, y + Math.sin(angle) * len
        )
        grad.addColorStop(0,    `${color}0)`)
        grad.addColorStop(0.45, `${color}${alpha * 0.7})`)
        grad.addColorStop(0.5,  `${color}${alpha})`)
        grad.addColorStop(0.55, `${color}${alpha * 0.7})`)
        grad.addColorStop(1,    `${color}0)`)
        ctx.beginPath()
        ctx.moveTo(x - Math.cos(angle) * len, y - Math.sin(angle) * len)
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
        ctx.strokeStyle = grad
        ctx.lineWidth   = r * 0.5
        ctx.stroke()
      }
      ctx.restore()
    }

    // ─── MAIN DRAW LOOP ───────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // 1. Milky Way band
      drawMilkyWay()

      // 2. Twinkling stars
      for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed
        const twinkle = s.twinkleAmp * Math.sin(s.twinklePhase)
        const a       = Math.max(0.05, s.alpha + twinkle)

        if (s.isBright) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5)
          glow.addColorStop(0, `${s.color}${a * 0.7})`)
          glow.addColorStop(1, `${s.color}0)`)
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
          drawSpike(s.x, s.y, s.r, a, s.color)
        }

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle   = `${s.color}${a})`
        ctx.shadowBlur  = s.isBright ? 8 : 3
        ctx.shadowColor = `${s.color}1)`
        ctx.fill()
        ctx.shadowBlur  = 0
      }

      // 3. Shooting stars / meteors
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i]

        // Inactive — count down until next spawn
        if (!m.active) {
          m.spawnTimer--
          if (m.spawnTimer <= 0) {
            meteors[i] = spawnMeteor()
          }
          continue
        }

        // Record trail position BEFORE moving
        m.trail.push({ x: m.x, y: m.y })
        if (m.trail.length > 28) m.trail.shift()

        m.x += m.vx
        m.y += m.vy

        // Draw trail segments
        for (let t = 0; t < m.trail.length - 1; t++) {
          const progress = t / m.trail.length
          const ta       = m.alpha * progress * 0.9
          const tw       = m.width * progress

          const grad = ctx.createLinearGradient(
            m.trail[t].x,     m.trail[t].y,
            m.trail[t + 1].x, m.trail[t + 1].y
          )
          grad.addColorStop(0, `hsla(${m.hue}, 80%, 85%, 0)`)
          grad.addColorStop(1, `hsla(${m.hue}, 80%, 95%, ${ta})`)

          ctx.beginPath()
          ctx.moveTo(m.trail[t].x, m.trail[t].y)
          ctx.lineTo(m.trail[t + 1].x, m.trail[t + 1].y)
          ctx.strokeStyle = grad
          ctx.lineWidth   = tw
          ctx.lineCap     = 'round'
          ctx.stroke()
        }

        // Meteor head glow
        const headGlow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.width * 4)
        headGlow.addColorStop(0,   `hsla(${m.hue}, 90%, 98%, ${m.alpha})`)
        headGlow.addColorStop(0.4, `hsla(${m.hue}, 85%, 80%, ${m.alpha * 0.6})`)
        headGlow.addColorStop(1,   `hsla(${m.hue}, 80%, 60%, 0)`)
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.width * 4, 0, Math.PI * 2)
        ctx.fillStyle = headGlow
        ctx.fill()

        // Deactivate when off screen
        if (m.x > W + 50 || m.y > H + 50 || m.x < -50) {
          m.active     = false
          m.spawnTimer = Math.random() * 240 + 80
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}
// ═════════════════════════════════════════════════════════════════════════════
//  7. AURORA — Northern Lights with flowing ribbons of colour
// ═════════════════════════════════════════════════════════════════════════════

function AuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    // Background stars
    interface AuroraStar { x: number; y: number; r: number; a: number; tw: number; twS: number }
    const auroraStars: AuroraStar[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.7,
      r: Math.random() * 0.7 + 0.1,
      a: Math.random() * 0.5 + 0.2,
      tw: Math.random() * Math.PI * 2,
      twS: Math.random() * 0.02 + 0.005,
    }))

    interface AuroraRibbon {
      // Control points for the wave, updated each frame
      points: number[]   // y-offsets for control points along x
      phase:  number
      speed:  number
      hue:    number
      hue2:   number
      alpha:  number
      height: number     // vertical thickness
      yBase:  number     // base y position (0..0.5 of H)
    }

    const ribbons: AuroraRibbon[] = [
      { points: Array(12).fill(0), phase: 0,            speed: 0.008, hue: 150, hue2: 180, alpha: 0.18, height: H * 0.22, yBase: H * 0.12 },
      { points: Array(12).fill(0), phase: Math.PI,      speed: 0.006, hue: 170, hue2: 200, alpha: 0.14, height: H * 0.18, yBase: H * 0.20 },
      { points: Array(12).fill(0), phase: Math.PI / 2,  speed: 0.010, hue: 280, hue2: 320, alpha: 0.10, height: H * 0.14, yBase: H * 0.08 },
      { points: Array(12).fill(0), phase: Math.PI * 1.5,speed: 0.007, hue: 120, hue2: 160, alpha: 0.12, height: H * 0.20, yBase: H * 0.16 },
    ]

    let t = 0

    const drawRibbon = (r: AuroraRibbon) => {
      const segs    = r.points.length
      const segW    = W / (segs - 1)

      // Update wave points
      for (let i = 0; i < segs; i++) {
        r.points[i] = Math.sin(r.phase + i * 0.7) * r.height * 0.35
                    + Math.sin(r.phase * 0.6 + i * 1.2) * r.height * 0.2
      }
      r.phase += r.speed

      // Top edge curve
      const topY  = (i: number) => r.yBase + r.points[i]
      const botY  = (i: number) => r.yBase + r.height + r.points[i] * 0.4

      // Draw filled ribbon with vertical gradient
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, topY(0))
      for (let i = 1; i < segs; i++) {
        const px = (i - 0.5) * segW
        ctx.quadraticCurveTo((i - 1) * segW, topY(i - 1), px, (topY(i - 1) + topY(i)) / 2)
      }
      ctx.lineTo(W, topY(segs - 1))
      ctx.lineTo(W, botY(segs - 1))
      for (let i = segs - 2; i >= 0; i--) {
        const px = (i + 0.5) * segW
        ctx.quadraticCurveTo((i + 1) * segW, botY(i + 1), px, (botY(i) + botY(i + 1)) / 2)
      }
      ctx.lineTo(0, botY(0))
      ctx.closePath()

      // Vertical gradient: bright middle, fade top & bottom
      const midY = r.yBase + r.height * 0.5
      const grad = ctx.createLinearGradient(0, r.yBase, 0, r.yBase + r.height)
      grad.addColorStop(0,   `hsla(${r.hue}, 90%, 65%, 0)`)
      grad.addColorStop(0.3, `hsla(${r.hue}, 90%, 70%, ${r.alpha})`)
      grad.addColorStop(0.5, `hsla(${r.hue2},95%, 80%, ${r.alpha * 1.4})`)
      grad.addColorStop(0.7, `hsla(${r.hue2},90%, 65%, ${r.alpha})`)
      grad.addColorStop(1,   `hsla(${r.hue2},85%, 55%, 0)`)

      ctx.fillStyle = grad
      ctx.fill()

      // Soft edge glow
      ctx.shadowBlur  = 28
      ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, 0.3)`
      ctx.fill()
      ctx.shadowBlur  = 0
      ctx.restore()
    }

    const draw = () => {
      t++
      ctx.clearRect(0, 0, W, H)

      // Stars
      for (const s of auroraStars) {
        s.tw += s.twS
        const a = s.a * (0.5 + 0.5 * Math.sin(s.tw))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,230,255,${a})`
        ctx.fill()
      }

      // Aurora ribbons — composited with screen blend for glow
      ctx.globalCompositeOperation = 'screen'
      for (const r of ribbons) drawRibbon(r)
      ctx.globalCompositeOperation = 'source-over'

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  8. FIREFLIES — Dark night scene with grass silhouette + glowing jugnu
// ═════════════════════════════════════════════════════════════════════════════

function FirefliesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface NightStar { x: number; y: number; r: number; a: number; tw: number; twS: number }
    const nightStars: NightStar[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.65,
      r: Math.random() * 0.6 + 0.1,
      a: Math.random() * 0.35 + 0.1,
      tw: Math.random() * Math.PI * 2,
      twS: Math.random() * 0.018 + 0.004,
    }))

    const drawTree = (x: number, h: number, w: number) => {
      ctx.beginPath()
      ctx.rect(x - w * 0.06, H - h * 0.3, w * 0.12, h * 0.3)
      for (let tier = 0; tier < 3; tier++) {
        const tierH = h * (0.45 - tier * 0.08)
        const tierW = w  * (1    - tier * 0.22)
        const tierY = H - h * 0.28 - tier * h * 0.3
        ctx.moveTo(x,           tierY - tierH)
        ctx.lineTo(x - tierW/2, tierY)
        ctx.lineTo(x + tierW/2, tierY)
        ctx.closePath()
      }
      // ✅ FIX: 0.95 → 0.55 (trees semi-transparent)
      ctx.fillStyle = 'rgba(5,12,5,0.55)'
      ctx.fill()
    }

    const BLADE_COUNT = 140
    interface Blade { x: number; h: number; w: number; lean: number }
    const blades: Blade[] = Array.from({ length: BLADE_COUNT }, () => ({
      x:    Math.random() * W,
      h:    Math.random() * 55 + 18,
      w:    Math.random() * 4  + 1.5,
      lean: (Math.random() - 0.5) * 0.35,
    }))

    const drawGrass = () => {
      for (const b of blades) {
        ctx.beginPath()
        ctx.moveTo(b.x, H)
        ctx.quadraticCurveTo(
          b.x + b.lean * b.h,
          H - b.h * 0.55,
          b.x + b.lean * b.h * 1.6,
          H - b.h
        )
        ctx.lineWidth   = b.w
        // ✅ FIX: 0.92 → 0.45 (grass semi-transparent)
        ctx.strokeStyle = 'rgba(8,20,8,0.45)'
        ctx.lineCap     = 'round'
        ctx.stroke()
      }
    }

    interface Firefly {
      x: number; y: number
      vx: number; vy: number
      glowPhase: number; glowSpeed: number
      r: number
      litDuration: number; offDuration: number
      litTimer: number; isLit: boolean
      wanderT: number
    }

    const FF_COUNT = 55
    const fireflies: Firefly[] = Array.from({ length: FF_COUNT }, () => {
      const lit = Math.random() < 0.5
      return {
        x:           Math.random() * W,
        y:           H * 0.35 + Math.random() * H * 0.55,
        vx:          (Math.random() - 0.5) * 0.55,
        vy:          (Math.random() - 0.5) * 0.35,
        glowPhase:   Math.random() * Math.PI * 2,
        glowSpeed:   Math.random() * 0.06 + 0.03,
        r:           Math.random() * 2.0 + 1.2,
        litDuration: Math.random() * 80  + 40,
        offDuration: Math.random() * 120 + 60,
        litTimer:    Math.random() * 120,
        isLit:       lit,
        wanderT:     Math.random() * 100,
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // ✅ MAIN FIX: 0.92/0.85/0.7 → 0.18/0.15/0.10
      // पहले यह पूरी screen को काला कर देता था
      const skyG = ctx.createLinearGradient(0, 0, 0, H)
      skyG.addColorStop(0,   'rgba(2,4,15,0.18)')
      skyG.addColorStop(0.6, 'rgba(3,8,20,0.15)')
      skyG.addColorStop(1,   'rgba(5,10,5,0.10)')
      ctx.fillStyle = skyG
      ctx.fillRect(0, 0, W, H)

      // Stars
      for (const s of nightStars) {
        s.tw += s.twS
        const a = s.a * (0.5 + 0.5 * Math.sin(s.tw))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,230,200,${a})`
        ctx.fill()
      }

      // Trees
      const treePositions = [
        { x: W * 0.04, h: H * 0.38, w: 70 },
        { x: W * 0.12, h: H * 0.32, w: 55 },
        { x: W * 0.88, h: H * 0.35, w: 65 },
        { x: W * 0.96, h: H * 0.42, w: 80 },
        { x: W * 0.78, h: H * 0.28, w: 50 },
        { x: W * 0.23, h: H * 0.25, w: 45 },
      ]
      for (const t of treePositions) drawTree(t.x, t.h, t.w)

      // Fireflies
      for (const f of fireflies) {
        f.litTimer--
        if (f.litTimer <= 0) {
          f.isLit    = !f.isLit
          f.litTimer = f.isLit ? f.litDuration : f.offDuration
        }

        f.wanderT += 0.01
        f.x += f.vx + Math.sin(f.wanderT * 1.8) * 0.3
        f.y += f.vy + Math.cos(f.wanderT * 1.3) * 0.2

        if (f.x < 0)  f.x = W
        if (f.x > W)  f.x = 0
        if (f.y < H * 0.3) f.vy = Math.abs(f.vy)
        if (f.y > H - 10)  f.vy = -Math.abs(f.vy)

        f.glowPhase += f.glowSpeed
        const pulse = 0.6 + 0.4 * Math.sin(f.glowPhase)

        if (f.isLit) {
          const aura = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 10)
          aura.addColorStop(0,   `rgba(180,255,80,${0.18 * pulse})`)
          aura.addColorStop(0.4, `rgba(140,230,60,${0.10 * pulse})`)
          aura.addColorStop(1,   'rgba(100,200,40,0)')
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r * 10, 0, Math.PI * 2)
          ctx.fillStyle = aura
          ctx.fill()

          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
          ctx.fillStyle   = `rgba(220,255,120,${0.85 * pulse})`
          ctx.shadowBlur  = 12
          ctx.shadowColor = 'rgba(180,255,80,0.9)'
          ctx.fill()
          ctx.shadowBlur  = 0
        } else {
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(80,120,40,0.12)'
          ctx.fill()
        }
      }

      drawGrass()
      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  9. RAIN — Three modes: rain_light | rain_storm | rain_fog
// ═════════════════════════════════════════════════════════════════════════════

function RainCanvas({ mode }: { mode: 'light' | 'storm' | 'fog' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    // Config per mode
    const cfg = {
      light: { count: 120, speed: [4, 7],   len: [12, 22], angle: 0.08, alpha: [0.25, 0.5],  wind: 0.3,  fogAlpha: 0,    lightning: false },
      storm: { count: 280, speed: [10, 18],  len: [18, 38], angle: 0.28, alpha: [0.35, 0.7],  wind: 1.8,  fogAlpha: 0,    lightning: true  },
      fog:   { count: 80,  speed: [2, 5],    len: [8,  16], angle: 0.05, alpha: [0.15, 0.35], wind: 0.15, fogAlpha: 0.18, lightning: false },
    }[mode]

    interface Drop {
      x: number; y: number
      vx: number; vy: number
      len: number; alpha: number
      // Ripple on hit
      ripple: boolean
      rippleR: number; rippleX: number; rippleY: number; rippleA: number
    }

    const makeDrop = (startY?: number): Drop => ({
      x:       Math.random() * (W + 100) - 50,
      y:       startY ?? Math.random() * H,
      vx:      cfg.wind + (Math.random() - 0.5) * 0.3,
      vy:      cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]),
      len:     cfg.len[0]   + Math.random() * (cfg.len[1]   - cfg.len[0]),
      alpha:   cfg.alpha[0] + Math.random() * (cfg.alpha[1] - cfg.alpha[0]),
      ripple:  false, rippleR: 0, rippleX: 0, rippleY: 0, rippleA: 0,
    })

    const drops: Drop[] = Array.from({ length: cfg.count }, () => makeDrop())

    // Lightning state
    let lightningAlpha  = 0
    let lightningTimer  = Math.random() * 200 + 100
    let lightningBolts: Array<{ pts: Array<{ x: number; y: number }> }> = []

    const generateBolt = () => {
      const pts: Array<{ x: number; y: number }> = []
      let bx = W * (0.2 + Math.random() * 0.6)
      let by = 0
      pts.push({ x: bx, y: by })
      while (by < H * 0.7) {
        bx += (Math.random() - 0.5) * 80
        by += Math.random() * 60 + 30
        pts.push({ x: bx, y: by })
      }
      return { pts }
    }

    // Fog particles (for fog mode)
    interface FogParticle { x: number; y: number; r: number; alpha: number; vx: number; phase: number }
    const fogParticles: FogParticle[] = mode === 'fog'
      ? Array.from({ length: 18 }, () => ({
          x: Math.random() * W, y: H * (0.3 + Math.random() * 0.7),
          r: Math.random() * 180 + 80,
          alpha: Math.random() * 0.08 + 0.03,
          vx: (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
        }))
      : []

    let t = 0

    const draw = () => {
      t++
      ctx.clearRect(0, 0, W, H)

      // Fog layer
      if (mode === 'fog') {
        for (const fp of fogParticles) {
          fp.x    += fp.vx
          fp.phase += 0.005
          if (fp.x - fp.r > W) fp.x = -fp.r
          if (fp.x + fp.r < 0) fp.x = W + fp.r
          const a  = fp.alpha * (0.7 + 0.3 * Math.sin(fp.phase))
          const fg = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, fp.r)
          fg.addColorStop(0, `rgba(180,200,220,${a})`)
          fg.addColorStop(1, 'rgba(180,200,220,0)')
          ctx.beginPath()
          ctx.arc(fp.x, fp.y, fp.r, 0, Math.PI * 2)
          ctx.fillStyle = fg
          ctx.fill()
        }
      }

      // Lightning
      if (cfg.lightning) {
        lightningTimer--
        if (lightningTimer <= 0) {
          lightningAlpha  = 0.9
          lightningBolts  = [generateBolt(), generateBolt()]
          lightningTimer  = Math.random() * 300 + 150
        }
        if (lightningAlpha > 0) {
          // Flash overlay
          ctx.fillStyle   = `rgba(200,220,255,${lightningAlpha * 0.12})`
          ctx.fillRect(0, 0, W, H)

          // Draw bolts
          for (const bolt of lightningBolts) {
            ctx.save()
            ctx.strokeStyle = `rgba(200,220,255,${lightningAlpha * 0.95})`
            ctx.lineWidth   = 1.5 * lightningAlpha
            ctx.shadowBlur  = 20 * lightningAlpha
            ctx.shadowColor = 'rgba(180,210,255,0.8)'
            ctx.beginPath()
            ctx.moveTo(bolt.pts[0].x, bolt.pts[0].y)
            for (let p = 1; p < bolt.pts.length; p++) ctx.lineTo(bolt.pts[p].x, bolt.pts[p].y)
            ctx.stroke()
            ctx.restore()
          }
          lightningAlpha *= 0.82
        }
      }

      // Rain drops
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]

        d.x += d.vx
        d.y += d.vy

        // Hit ground — spawn ripple
        if (d.y > H) {
          d.ripple  = true
          d.rippleX = d.x
          d.rippleY = H - 2
          d.rippleR = 0
          d.rippleA = d.alpha * 0.6
          drops[i]  = makeDrop(0)
          drops[i].x = d.x
          continue
        }

        // Draw drop (angled line)
        const ex = d.x - d.vx / d.vy * d.len * cfg.angle * 10
        const ey = d.y - d.len

        const grad = ctx.createLinearGradient(ex, ey, d.x, d.y)
        grad.addColorStop(0, `rgba(180,210,240,0)`)
        grad.addColorStop(1, `rgba(180,210,240,${d.alpha})`)

        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(d.x, d.y)
        ctx.strokeStyle = grad
        ctx.lineWidth   = mode === 'storm' ? 1.2 : 0.8
        ctx.stroke()
      }

      // Ripples
      for (const d of drops) {
        if (d.ripple && d.rippleR < 18) {
          d.rippleR += 0.8
          d.rippleA *= 0.88
          ctx.beginPath()
          ctx.ellipse(d.rippleX, d.rippleY, d.rippleR, d.rippleR * 0.35, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(180,210,240,${d.rippleA})`
          ctx.lineWidth   = 0.7
          ctx.stroke()
          if (d.rippleR >= 18) d.ripple = false
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [mode])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  10. SNOW — Soft falling snowflakes with varying shapes
// ═════════════════════════════════════════════════════════════════════════════

function SnowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface Snowflake {
      x: number; y: number
      r: number
      vx: number; vy: number
      alpha: number
      wobble: number; wobbleSpeed: number; wobbleAmp: number
      rotation: number; rotSpeed: number
      arms: number  // 0 = circle, 6 = snowflake arms
      drift: number
    }

    const COUNT = 160
    const flakes: Snowflake[] = Array.from({ length: COUNT }, () => {
      const r = Math.random() * 4 + 1
      return {
        x:           Math.random() * W,
        y:           Math.random() * H,
        r,
        vx:          (Math.random() - 0.5) * 0.4,
        vy:          Math.random() * 1.2 + 0.3,
        alpha:       Math.random() * 0.6 + 0.3,
        wobble:      Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.025 + 0.008,
        wobbleAmp:   Math.random() * 1.2 + 0.3,
        rotation:    Math.random() * Math.PI * 2,
        rotSpeed:    (Math.random() - 0.5) * 0.015,
        arms:        r > 2.5 ? 6 : 0,
        drift:       Math.random() * Math.PI * 2,
      }
    })

    const drawFlake = (f: Snowflake) => {
      ctx.save()
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rotation)
      ctx.globalAlpha = f.alpha

      if (f.arms === 0) {
        // Simple circle flake
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r)
        g.addColorStop(0,   'rgba(255,255,255,1)')
        g.addColorStop(0.6, 'rgba(230,240,255,0.8)')
        g.addColorStop(1,   'rgba(200,220,255,0)')
        ctx.beginPath()
        ctx.arc(0, 0, f.r, 0, Math.PI * 2)
        ctx.fillStyle   = g
        ctx.shadowBlur  = 4
        ctx.shadowColor = 'rgba(200,230,255,0.8)'
        ctx.fill()
        ctx.shadowBlur  = 0
      } else {
        // Crystalline snowflake arms
        ctx.strokeStyle = 'rgba(220,235,255,0.9)'
        ctx.lineWidth   = 0.8
        ctx.shadowBlur  = 5
        ctx.shadowColor = 'rgba(200,230,255,0.7)'
        for (let a = 0; a < 6; a++) {
          const angle = (a / 6) * Math.PI * 2
          const ax    = Math.cos(angle) * f.r
          const ay    = Math.sin(angle) * f.r
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(ax, ay)
          ctx.stroke()
          // Branch
          const bLen = f.r * 0.4
          const bAng = angle + Math.PI / 4
          ctx.beginPath()
          ctx.moveTo(ax * 0.55, ay * 0.55)
          ctx.lineTo(ax * 0.55 + Math.cos(bAng) * bLen, ay * 0.55 + Math.sin(bAng) * bLen)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(ax * 0.55, ay * 0.55)
          ctx.lineTo(ax * 0.55 + Math.cos(angle - Math.PI / 4) * bLen, ay * 0.55 + Math.sin(angle - Math.PI / 4) * bLen)
          ctx.stroke()
        }
        // Center dot
        ctx.beginPath()
        ctx.arc(0, 0, f.r * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(240,248,255,0.9)'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      ctx.globalAlpha = 1
      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      for (const f of flakes) {
        f.wobble   += f.wobbleSpeed
        f.rotation += f.rotSpeed
        f.drift    += 0.008
        f.x += f.vx + Math.sin(f.wobble) * f.wobbleAmp + Math.sin(f.drift) * 0.3
        f.y += f.vy

        if (f.y - f.r > H)  { f.y = -f.r; f.x = Math.random() * W }
        if (f.x - f.r > W)  f.x = -f.r
        if (f.x + f.r < 0)  f.x = W + f.r

        drawFlake(f)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  11. FOG — Drifting mist layers with depth parallax
// ═════════════════════════════════════════════════════════════════════════════

function FogCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface FogLayer {
      x: number; y: number
      r: number       // radius of the blob
      vx: number      // drift speed (layers far away move slower)
      alpha: number
      phase: number
      phaseSpeed: number
      depth: number   // 0 = far, 1 = close
    }

    const LAYER_COUNT = 30
    const fogLayers: FogLayer[] = Array.from({ length: LAYER_COUNT }, () => {
      const depth = Math.random()
      return {
        x:          Math.random() * W,
        y:          H * (0.2 + Math.random() * 0.8),
        r:          (120 + Math.random() * 220) * (0.5 + depth * 0.5),
        vx:         (0.08 + depth * 0.25) * (Math.random() > 0.5 ? 1 : -1),
        alpha:      0.04 + depth * 0.08,
        phase:      Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.004 + 0.001,
        depth,
      }
    })

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Sort: far layers first
      const sorted = [...fogLayers].sort((a, b) => a.depth - b.depth)

      for (const fl of sorted) {
        fl.x     += fl.vx
        fl.phase += fl.phaseSpeed

        if (fl.x - fl.r > W)  fl.x = -fl.r
        if (fl.x + fl.r < 0)  fl.x = W + fl.r

        const a = fl.alpha * (0.7 + 0.3 * Math.sin(fl.phase))

        // Elliptical fog blob (wider than tall)
        ctx.save()
        ctx.translate(fl.x, fl.y)
        ctx.scale(1, 0.4)

        const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, fl.r)
        fg.addColorStop(0,   `rgba(200,210,220,${a})`)
        fg.addColorStop(0.5, `rgba(185,200,215,${a * 0.55})`)
        fg.addColorStop(1,   'rgba(170,190,210,0)')

        ctx.beginPath()
        ctx.arc(0, 0, fl.r, 0, Math.PI * 2)
        ctx.fillStyle = fg
        ctx.fill()
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  12. LIGHTNING — Dramatic electric storm with forked bolts + thunder flash
// ═════════════════════════════════════════════════════════════════════════════

function LightningCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface Bolt {
      pts:    Array<{ x: number; y: number }>
      forks:  Array<Array<{ x: number; y: number }>>
      alpha:  number
      decay:  number
      hue:    number
      width:  number
    }

    const buildBolt = (): Bolt => {
      const startX = W * (0.1 + Math.random() * 0.8)
      const pts: Array<{ x: number; y: number }> = [{ x: startX, y: 0 }]
      let cx = startX
      let cy = 0

      while (cy < H * 0.85) {
        cx += (Math.random() - 0.5) * 100
        cy += Math.random() * 55 + 25
        pts.push({ x: cx, y: cy })
      }

      // Random forks branching off the main bolt
      const forks: Array<Array<{ x: number; y: number }>> = []
      for (let f = 0; f < Math.floor(Math.random() * 4 + 1); f++) {
        const startIdx = Math.floor(Math.random() * (pts.length * 0.7))
        const fork: Array<{ x: number; y: number }> = [{ ...pts[startIdx] }]
        let fx = pts[startIdx].x
        let fy = pts[startIdx].y
        for (let s = 0; s < Math.floor(Math.random() * 5 + 3); s++) {
          fx += (Math.random() - 0.5) * 70
          fy += Math.random() * 40 + 15
          fork.push({ x: fx, y: fy })
        }
        forks.push(fork)
      }

      return {
        pts,
        forks,
        alpha: 0.95,
        decay: Math.random() * 0.06 + 0.04,
        hue:   Math.random() * 60 + 190,  // blue-purple-white
        width: Math.random() * 2 + 1,
      }
    }

    const bolts:     Bolt[] = []
    let flashAlpha    = 0
    let strikeTimer   = Math.random() * 120 + 60

    const drawBolt = (b: Bolt) => {
      const drawLine = (pts: Array<{ x: number; y: number }>, w: number, a: number) => {
        if (pts.length < 2) return
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
        ctx.strokeStyle = `hsla(${b.hue}, 80%, 90%, ${a})`
        ctx.lineWidth   = w
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.shadowBlur  = 18 * a
        ctx.shadowColor = `hsla(${b.hue}, 100%, 80%, ${a * 0.8})`
        ctx.stroke()
        ctx.restore()
      }

      // Outer glow pass
      drawLine(b.pts, b.width * 5, b.alpha * 0.15)
      // Core
      drawLine(b.pts, b.width, b.alpha)
      // White hot center
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(b.pts[0].x, b.pts[0].y)
      for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i].x, b.pts[i].y)
      ctx.strokeStyle = `rgba(255,255,255,${b.alpha * 0.7})`
      ctx.lineWidth   = b.width * 0.4
      ctx.stroke()
      ctx.restore()

      // Forks (thinner, less alpha)
      for (const fork of b.forks) {
        drawLine(fork, b.width * 0.5, b.alpha * 0.55)
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Storm flash overlay
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(180,200,255,${flashAlpha * 0.15})`
        ctx.fillRect(0, 0, W, H)
        flashAlpha *= 0.78
      }

      // Strike timer
      strikeTimer--
      if (strikeTimer <= 0) {
        const count  = Math.floor(Math.random() * 2 + 1)
        for (let i = 0; i < count; i++) bolts.push(buildBolt())
        flashAlpha   = 1
        strikeTimer  = Math.random() * 180 + 80
      }

      // Draw & decay bolts
      for (let i = bolts.length - 1; i >= 0; i--) {
        drawBolt(bolts[i])
        bolts[i].alpha -= bolts[i].decay
        if (bolts[i].alpha <= 0) bolts.splice(i, 1)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}

// ═════════════════════════════════════════════════════════════════════════════
//  13. SANDSTORM — Desert wind with drifting sand particles + dust clouds
// ═════════════════════════════════════════════════════════════════════════════

function SandstormCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)

    interface SandParticle {
      x: number; y: number
      vx: number; vy: number
      r: number
      alpha: number
      hue: number   // warm sandy tones
    }

    interface DustCloud {
      x: number; y: number
      r: number; vx: number
      alpha: number; phase: number; phaseSpeed: number
    }

    const SAND_COUNT = 350
    const DUST_COUNT = 18

    const makeSand = (): SandParticle => ({
      x:     -10,
      y:     Math.random() * H,
      vx:    Math.random() * 6 + 4,
      vy:    (Math.random() - 0.5) * 1.5,
      r:     Math.random() * 1.8 + 0.3,
      alpha: Math.random() * 0.55 + 0.2,
      hue:   30 + Math.random() * 30,   // warm sand: 30-60 hue
    })

    const sands: SandParticle[] = Array.from({ length: SAND_COUNT }, () => {
      const s = makeSand()
      s.x = Math.random() * W   // scatter on init
      return s
    })

    const dustClouds: DustCloud[] = Array.from({ length: DUST_COUNT }, () => ({
      x:          Math.random() * W,
      y:          H * (0.3 + Math.random() * 0.7),
      r:          Math.random() * 200 + 80,
      vx:         Math.random() * 1.2 + 0.4,
      alpha:      Math.random() * 0.07 + 0.03,
      phase:      Math.random() * Math.PI * 2,
      phaseSpeed: Math.random() * 0.006 + 0.002,
    }))

    // Wind streaks (fast horizontal lines at varying y)
    interface WindStreak { x: number; y: number; len: number; vx: number; alpha: number }
    const streaks: WindStreak[] = Array.from({ length: 40 }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      len:   Math.random() * 80 + 30,
      vx:    Math.random() * 12 + 6,
      alpha: Math.random() * 0.2 + 0.05,
    }))

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Dust clouds (background layer)
      for (const d of dustClouds) {
        d.x     += d.vx
        d.phase += d.phaseSpeed
        if (d.x - d.r > W) d.x = -d.r

        const a  = d.alpha * (0.7 + 0.3 * Math.sin(d.phase))
        const dg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r)
        dg.addColorStop(0,   `rgba(210,170,100,${a})`)
        dg.addColorStop(0.5, `rgba(190,150,80,${a * 0.5})`)
        dg.addColorStop(1,   'rgba(180,140,70,0)')

        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.scale(1, 0.45)
        ctx.beginPath()
        ctx.arc(0, 0, d.r, 0, Math.PI * 2)
        ctx.fillStyle = dg
        ctx.fill()
        ctx.restore()
      }

      // Wind streaks
      for (const s of streaks) {
        s.x += s.vx
        if (s.x > W + s.len) s.x = -s.len

        const sg = ctx.createLinearGradient(s.x, s.y, s.x + s.len, s.y)
        sg.addColorStop(0,   'rgba(220,180,100,0)')
        sg.addColorStop(0.4, `rgba(220,180,100,${s.alpha})`)
        sg.addColorStop(0.6, `rgba(220,180,100,${s.alpha})`)
        sg.addColorStop(1,   'rgba(220,180,100,0)')

        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x + s.len, s.y)
        ctx.strokeStyle = sg
        ctx.lineWidth   = 0.7
        ctx.stroke()
      }

      // Sand particles
      for (let i = 0; i < sands.length; i++) {
        const s = sands[i]
        s.x += s.vx
        s.y += s.vy + Math.sin(s.x * 0.02) * 0.4

        if (s.x > W + 10) sands[i] = makeSand()

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle   = `hsla(${s.hue}, 65%, 62%, ${s.alpha})`
        ctx.shadowBlur  = s.r > 1.2 ? 3 : 0
        ctx.shadowColor = `hsla(${s.hue}, 70%, 55%, 0.4)`
        ctx.fill()
        ctx.shadowBlur  = 0
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={BASE} />
}