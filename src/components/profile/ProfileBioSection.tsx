import { useState } from 'react'
import { Textarea } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import ProfileCounterText from './ProfileCounterText'
import { palette } from '../../theme/palette'
import { space } from '../../theme/spacing'
import { typography } from '../../theme/typography'

type Props = {
  bio: string
  setBio: (value: string) => void
}

export default function ProfileBioSection({ bio, setBio }: Props) {
  const [focused, setFocused] = useState(false)

  return (
    <ProfileCard>
      <SectionTitle text='一句话简介（选填）' />
      <ProfileHelperText text='任何用户在地图上点击你的标记后可以看到这句介绍。' />
      <ProfileInputBox marginBottom='0' focused={focused}>
        <Textarea
          value={bio}
          placeholder='简单介绍一下自己...可补充个人小红书、公众号、视频号、抖音等。'
          maxlength={200}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setBio(e.detail.value)}
          style={{ ...typography.body, color: palette.text, width: '100%', minHeight: space(6) }}
        />
      </ProfileInputBox>
      <ProfileCounterText current={bio.length} max={200} marginBottom='0' />
    </ProfileCard>
  )
}
