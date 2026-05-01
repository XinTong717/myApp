import { useState } from 'react'
import { Textarea } from '@tarojs/components'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import ProfileCounterText from './ProfileCounterText'
import ProfileSectionHeading from './ProfileSectionHeading'
import { profilePalette as palette } from './palette'
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
      <ProfileHelperText text='比如：一对一升学规划咨询、项目制学习支持、家长沟通陪跑等。' marginBottom='6px' />
      <ProfileInputBox marginBottom='0' focused={focused}>
        <Textarea
          value={eduServices}
          placeholder='比如：一对一升学规划咨询...'
          maxlength={500}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setEduServices(e.detail.value)}
          style={{ ...typography.body, color: palette.text, width: '100%', minHeight: '90px' }}
        />
      </ProfileInputBox>
      <ProfileCounterText current={eduServices.length} max={500} />
    </ProfileCard>
  )
}
