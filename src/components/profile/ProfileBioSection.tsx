import { Textarea } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import ProfileCounterText from './ProfileCounterText'
import { profilePalette as palette } from './palette'

type Props = {
  bio: string
  setBio: (value: string) => void
}

export default function ProfileBioSection({ bio, setBio }: Props) {
  return (
    <ProfileCard>
      <SectionTitle text='一句话简介（选填）' />
      <ProfileHelperText text='其他用户在地图上点击你的标记后会看到这句话' />
      <ProfileInputBox marginBottom='0'>
        <Textarea value={bio} placeholder='简单介绍一下自己...' maxlength={200} onInput={(e) => setBio(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '60px' }} />
      </ProfileInputBox>
      <ProfileCounterText current={bio.length} max={200} marginBottom='0' />
    </ProfileCard>
  )
}
