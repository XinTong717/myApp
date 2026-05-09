import { View, Text } from '@tarojs/components'
import AppCard from './AppCard'
import AppPrimaryButton from './AppPrimaryButton'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
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
    <AppCard radius={radius.md}>
      <Text style={{ ...typography.body, color: palette.subtext }}>{text}</Text>
      {actionText && onAction ? (
        <View style={{ marginTop: space(3), alignSelf: 'flex-start' }}>
          <AppPrimaryButton text={actionText} variant='secondary' size='sm' appearance='inline' marginBottom='0' onClick={onAction} />
        </View>
      ) : null}
    </AppCard>
  )
}

export function ErrorRetryCard({ error, retryText = '重新加载', secondaryText, onRetry, onSecondary }: ErrorRetryCardProps) {
  return (
    <View style={{ padding: space(3), marginBottom: space(4), backgroundColor: palette.errorSoft, borderRadius: radius.md, border: `1px solid ${palette.brandSoft}` }}>
      <Text style={{ ...typography.meta, color: palette.error }}>{error}</Text>
      {onRetry ? (
        <View style={{ marginTop: space(3), alignSelf: 'flex-start' }}>
          <AppPrimaryButton text={retryText} variant='secondary' size='sm' appearance='inline' marginBottom='0' onClick={onRetry} />
        </View>
      ) : null}
      {secondaryText && onSecondary ? (
        <View style={{ marginTop: space(2), alignSelf: 'flex-start' }}>
          <AppPrimaryButton text={secondaryText} variant='ghost' size='sm' appearance='inline' marginBottom='0' onClick={onSecondary} />
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
        padding: `${space(2)} ${space(3)}`,
        borderRadius: radius.pill,
        backgroundColor: loading ? palette.surfaceSoft : palette.card,
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
