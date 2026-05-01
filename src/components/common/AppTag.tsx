import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type AppTagTone = 'neutral' | 'brand' | 'green' | 'accent'

type AppTagProps = {
  text: string
  tone?: AppTagTone
  marginRight?: string
  marginBottom?: string
}

function getToneColors(tone: AppTagTone) {
  if (tone === 'brand') return { bg: palette.brandSoft, text: palette.brand }
  if (tone === 'green') return { bg: palette.greenSoft, text: palette.green }
  if (tone === 'accent') return { bg: palette.accent2Soft, text: palette.accent2 }
  return { bg: palette.tag, text: palette.tagText }
}

export default function AppTag({ text, tone = 'neutral', marginRight = '8px', marginBottom = '8px' }: AppTagProps) {
  const colors = getToneColors(tone)

  return (
    <View style={{
      padding: '5px 10px',
      borderRadius: '999px',
      backgroundColor: colors.bg,
      marginRight,
      marginBottom,
    }}>
      <Text style={{ ...typography.caption, color: colors.text }}>{text}</Text>
    </View>
  )
}
