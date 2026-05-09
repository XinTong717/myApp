import { Text, View } from '@tarojs/components'
import AppIcon from './AppIcon'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppPromptBannerTone = 'brand' | 'warm' | 'green' | 'warning'

type AppPromptBannerProps = {
  title: string
  description?: string
  actionText?: string
  icon?: 'lock' | 'mapPin' | 'calendar' | 'user' | 'school' | 'spark' | 'edit-pencil' | 'check'
  tone?: AppPromptBannerTone
  flush?: boolean
  onClick?: () => void
}

function getTone(tone: AppPromptBannerTone) {
  if (tone === 'green') return { bg: palette.greenSoft, iconBg: palette.card, iconColor: palette.green, actionBg: palette.green, border: palette.lineSoft }
  if (tone === 'warning') return { bg: palette.warningSoft, iconBg: palette.card, iconColor: palette.warning, actionBg: palette.warning, border: palette.lineSoft }
  if (tone === 'warm') return { bg: palette.surfaceWarm, iconBg: palette.card, iconColor: palette.brand, actionBg: palette.brand, border: palette.lineSoft }
  return { bg: palette.card, iconBg: palette.iconBg, iconColor: palette.brand, actionBg: palette.brand, border: palette.line }
}

export default function AppPromptBanner({
  title,
  description,
  actionText,
  icon,
  tone = 'brand',
  flush = false,
  onClick,
}: AppPromptBannerProps) {
  const colors = getTone(tone)

  return (
    <View
      onClick={onClick}
      style={{
        backgroundColor: colors.bg,
        padding: `${space(3)} ${space(4)}`,
        borderRadius: flush ? '0' : radius.md,
        border: flush ? 'none' : `1px solid ${colors.border}`,
        borderBottom: flush ? `1px solid ${colors.border}` : undefined,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {icon ? <View style={{ marginRight: space(3) }}><AppIcon name={icon} size={34} backgroundColor={colors.iconBg} color={colors.iconColor} bordered /></View> : null}
      <View style={{ flex: 1, paddingRight: actionText ? space(3) : '0' }}>
        <Text style={{ ...typography.bodyStrong, color: palette.text }}>{title}</Text>
        {description ? <View style={{ marginTop: space(1) }}><Text style={{ ...typography.caption, color: palette.subtext }}>{description}</Text></View> : null}
      </View>
      {actionText ? (
        <View style={{ padding: `${space(2)} ${space(3)}`, borderRadius: radius.pill, backgroundColor: colors.actionBg }}>
          <Text style={{ ...typography.caption, color: '#FFF' }}>{actionText}</Text>
        </View>
      ) : null}
    </View>
  )
}
