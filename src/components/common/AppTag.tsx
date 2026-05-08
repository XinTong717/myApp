import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'

type AppTagTone = 'neutral' | 'brand' | 'green' | 'accent'

type AppTagProps = {
  text: string
  tone?: AppTagTone
  marginRight?: string
  marginBottom?: string
  padding?: string
  backgroundColor?: string
  textColor?: string
  className?: string
}

function joinClassNames(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
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
  className,
}: AppTagProps) {
  const colors = getToneColors(tone)
  const tagStyle = {
    '--tag-padding': padding,
    '--tag-bg': backgroundColor || colors.bg,
    '--tag-margin-right': marginRight,
    '--tag-margin-bottom': marginBottom,
  } as Record<string, string>

  return (
    <View
      className={joinClassNames('app-tag', className)}
      style={tagStyle}
    >
      <Text className='text-caption' style={{ color: textColor || colors.text }}>{text}</Text>
    </View>
  )
}
