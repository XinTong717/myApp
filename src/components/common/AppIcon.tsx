import { View } from '@tarojs/components'
import { palette } from '../../theme/palette'

type IconName = 'lock' | 'mapPin' | 'calendar' | 'user' | 'school' | 'spark'

type Props = {
  name: IconName
  size?: number
  color?: string
  backgroundColor?: string
  bordered?: boolean
}

function LockShape({ size, color }: { size: number; color: string }) {
  const bodyWidth = Math.round(size * 0.38)
  const bodyHeight = Math.round(size * 0.30)
  const shackleWidth = Math.round(size * 0.32)
  const shackleHeight = Math.round(size * 0.28)
  const stroke = Math.max(1.5, Math.round(size * 0.075))

  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - shackleWidth) / 2)}px`,
          top: `${Math.round(size * 0.25)}px`,
          width: `${shackleWidth}px`,
          height: `${shackleHeight}px`,
          border: `${stroke}px solid ${color}`,
          borderBottom: 'none',
          borderRadius: `${Math.round(size * 0.16)}px ${Math.round(size * 0.16)}px 0 0`,
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - bodyWidth) / 2)}px`,
          top: `${Math.round(size * 0.47)}px`,
          width: `${bodyWidth}px`,
          height: `${bodyHeight}px`,
          borderRadius: `${Math.round(size * 0.07)}px`,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function MapPinShape({ size, color }: { size: number; color: string }) {
  const outer = Math.round(size * 0.34)
  const inner = Math.max(3, Math.round(size * 0.13))
  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - outer) / 2)}px`,
          top: `${Math.round(size * 0.24)}px`,
          width: `${outer}px`,
          height: `${outer}px`,
          border: `${Math.max(1.5, Math.round(size * 0.07))}px solid ${color}`,
          borderRadius: '999px',
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - inner) / 2)}px`,
          top: `${Math.round(size * 0.37)}px`,
          width: `${inner}px`,
          height: `${inner}px`,
          borderRadius: '999px',
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - Math.max(2, size * 0.08)) / 2)}px`,
          top: `${Math.round(size * 0.57)}px`,
          width: `${Math.max(2, Math.round(size * 0.08))}px`,
          height: `${Math.round(size * 0.17)}px`,
          borderRadius: '999px',
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function CalendarShape({ size, color }: { size: number; color: string }) {
  const width = Math.round(size * 0.44)
  const height = Math.round(size * 0.38)
  const stroke = Math.max(1.5, Math.round(size * 0.065))
  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - width) / 2)}px`,
          top: `${Math.round(size * 0.31)}px`,
          width: `${width}px`,
          height: `${height}px`,
          border: `${stroke}px solid ${color}`,
          borderRadius: `${Math.round(size * 0.06)}px`,
          boxSizing: 'border-box',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - width) / 2)}px`,
          top: `${Math.round(size * 0.42)}px`,
          width: `${width}px`,
          height: `${stroke}px`,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function UserShape({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round(size * 0.39)}px`,
          top: `${Math.round(size * 0.25)}px`,
          width: `${Math.round(size * 0.22)}px`,
          height: `${Math.round(size * 0.22)}px`,
          borderRadius: '999px',
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round(size * 0.30)}px`,
          top: `${Math.round(size * 0.53)}px`,
          width: `${Math.round(size * 0.40)}px`,
          height: `${Math.round(size * 0.20)}px`,
          borderRadius: `${Math.round(size * 0.16)}px ${Math.round(size * 0.16)}px ${Math.round(size * 0.07)}px ${Math.round(size * 0.07)}px`,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function SchoolShape({ size, color }: { size: number; color: string }) {
  const roof = Math.round(size * 0.42)
  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - roof) / 2)}px`,
          top: `${Math.round(size * 0.24)}px`,
          width: `${roof}px`,
          height: `${roof}px`,
          backgroundColor: color,
          transform: 'rotate(45deg)',
          borderRadius: `${Math.round(size * 0.04)}px`,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round(size * 0.30)}px`,
          top: `${Math.round(size * 0.48)}px`,
          width: `${Math.round(size * 0.40)}px`,
          height: `${Math.round(size * 0.24)}px`,
          backgroundColor: color,
          borderRadius: `0 0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.05)}px`,
        }}
      />
    </View>
  )
}

function SparkShape({ size, color }: { size: number; color: string }) {
  const bar = Math.max(2, Math.round(size * 0.08))
  return (
    <View style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <View
        style={{
          position: 'absolute',
          left: `${Math.round((size - bar) / 2)}px`,
          top: `${Math.round(size * 0.24)}px`,
          width: `${bar}px`,
          height: `${Math.round(size * 0.52)}px`,
          borderRadius: '999px',
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: `${Math.round(size * 0.24)}px`,
          top: `${Math.round((size - bar) / 2)}px`,
          width: `${Math.round(size * 0.52)}px`,
          height: `${bar}px`,
          borderRadius: '999px',
          backgroundColor: color,
        }}
      />
    </View>
  )
}

function IconShape({ name, size, color }: { name: IconName; size: number; color: string }) {
  switch (name) {
    case 'lock':
      return <LockShape size={size} color={color} />
    case 'mapPin':
      return <MapPinShape size={size} color={color} />
    case 'calendar':
      return <CalendarShape size={size} color={color} />
    case 'user':
      return <UserShape size={size} color={color} />
    case 'school':
      return <SchoolShape size={size} color={color} />
    case 'spark':
      return <SparkShape size={size} color={color} />
    default:
      return <SparkShape size={size} color={color} />
  }
}

export default function AppIcon({
  name,
  size = 22,
  color = palette.brand,
  backgroundColor = palette.iconBg,
  bordered = false,
}: Props) {
  const iconSize = Math.round(size * 0.72)

  return (
    <View
      aria-label={name}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        borderRadius: '999px',
        backgroundColor,
        border: bordered ? `1px solid ${palette.line}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <IconShape name={name} size={iconSize} color={color} />
    </View>
  )
}
