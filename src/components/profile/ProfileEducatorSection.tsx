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
  eduServices: string
  setEduServices: (value: string) => void
}

export default function ProfileEducatorSection({ eduServices, setEduServices }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <ProfileCard>
      <ProfileSectionHeading
        title='你提供的教育服务'
        description='帮助家庭了解你能提供什么样的支持'
      />
      <ProfileInputBox marginBottom='0' focused={focused}>
        <Textarea
          value={eduServices}
          placeholder='比如：一对一升学规划咨询...'
          maxlength={500}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setEduServices(e.detail.value)}
          style={{ ...typography.body, color: palette.text, width: '100%', minHeight: space(8) }}
        />
      </ProfileInputBox>
      <ProfileCounterText current={eduServices.length} max={500} />
    </ProfileCard>
  )
}
