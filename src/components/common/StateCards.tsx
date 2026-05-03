import { View, Text } from '@tarojs/components'
import AppCard from './AppCard'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type EmptyCardProps = {
  text: string
  actionText?: string
  onAction?: () => void
}

type ErrorRetryCardProps = {
  error: string
  retryText?: string
  secondaryText?: string
  onRetry?: () => void
  onSecondary?: () => void
}

type LoadMoreButtonProps = {
  visible?: boolean
  loading?: boolean
  onClick: () => void
}

export function EmptyCard({ text, actionText, onAction }: EmptyCardProps) {
  return (
    <AppCard radius='18px'>
      <Text style={{ ...typography.body, color: palette.subtext }}>{text}</Text>
      {actionText && onAction ? (
        <View onClick={onAction} style={{ marginTop: space(3), backgroundColor: palette.brandSoft, borderRadius: '12px', padding: `${space(2)} ${space(3)}`, alignSelf: 'flex-start' }}>
          <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>{actionText}</Text>
        </View>
      ) : null}
    </AppCard>
  )
}

export function ErrorRetryCard({ error, retryText = '重新加载', secondaryText, onRetry, onSecondary }: ErrorRetryCardProps) {
  return (
    <View style={{ padding: space(3), marginBottom: space(4), backgroundColor: palette.errorSoft, borderRadius: '14px', border: `1px solid ${palette.brandSoft}` }}>
      <Text style={{ ...typography.meta, color: palette.error }}>{error}</Text>
      {onRetry ? (
        <View onClick={onRetry} style={{ marginTop: '10px', backgroundColor: palette.brandSoft, borderRadius: '12px', padding: `${space(2)} ${space(3)}`, alignSelf: 'flex-start' }}>
          <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>{retryText}</Text>
        </View>
      ) : null}
      {secondaryText && onSecondary ? (
        <View onClick={onSecondary} style={{ marginTop: space(2), backgroundColor: palette.cardSoft, borderRadius: '12px', padding: `${space(2)} ${space(3)}`, alignSelf: 'flex-start' }}>
          <Text style={{ ...typography.caption, color: palette.brand, fontWeight: '700' }}>{secondaryText}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function LoadMoreButton({ visible = true, loading = false, onClick }: LoadMoreButtonProps) {
  if (!visible) return null
  return (
    <View
      onClick={loading ? undefined : onClick}
      style={{
        margin: `${space(1)} 0 ${space(4)}`,
        padding: `10px ${space(3)}`,
        borderRadius: '999px',
        backgroundColor: loading ? palette.surfaceSoft : '#FFFFFF',
        border: `1px solid ${palette.line}`,
        textAlign: 'center',
      }}
    >
      <Text style={{ ...typography.meta, color: loading ? palette.muted : palette.brand, fontWeight: '700' }}>
        {loading ? '加载中...' : '加载更多'}
      </Text>
    </View>
  )
}
