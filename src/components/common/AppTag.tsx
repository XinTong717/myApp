import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { radius, space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type AppTagTone = 'neutral' | 'brand' | 'green' | 'accent'

type AppTagProps = {
  text: string
  tone?: AppTagTone
  marginRight?: string
  marginBottom?: string
  padding?: string
  backgroundColor?: string
  textColor?: string
}

function getToneColors(tone: AppTagTone) {
  if (tone === 'brand') return { bg: palette.brandSoft, text: palette.brand }
  if (tone === 'green') return { bg: palette.greenSoft, text: palette.green }
  if (tone === 'accent') return { bg: palette.accent2Soft, text: palette.accent2 }
  return { bg: palette.tag, text: palette.tagText }
}

export default function AppTag({
  text,
  tone = 'neutral',
  marginRight = space(2),
  marginBottom = space(2),
  padding = `${space(1)} ${space(2)}`,
  backgroundColor,
  textColor,
}: AppTagProps) {
  const colors = getToneColors(tone)

  return (
    <View style={{
      padding,
      borderRadius: radius.sm,
      backgroundColor: backgroundColor || colors.bg,
      marginRight,
      marginBottom,
    }}>
      <Text style={{ ...typography.caption, color: textColor || colors.text }}>{text}</Text>
    </View>
  )
}
