import { useState } from 'react'
import { Textarea } from '@tarojs/components'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileCounterText from './ProfileCounterText'
import ProfileSectionHeading from './ProfileSectionHeading'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  companionContext: string
  setCompanionContext: (value: string) => void
}

export default function ProfileCompanionSection({ companionContext, setCompanionContext }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <ProfileCard>
      <ProfileSectionHeading
        title='你和这个生态的关系'
        description='这个说明会帮助别人理解你为什么在这里。'
      />
      <ProfileInputBox marginBottom='0' focused={focused}>
        <Textarea
          value={companionContext}
          placeholder='例如：高中休学过、gap year 中、长期关注多元教育与社区学习、观察研究者'
          maxlength={150}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setCompanionContext(e.detail.value)}
          style={{ ...typography.body, color: palette.text, width: '100%', minHeight: space(7) }}
        />
      </ProfileInputBox>
      <ProfileCounterText current={companionContext.length} max={150} />
    </ProfileCard>
  )
}
