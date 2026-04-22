import { View, Text, Textarea } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import { profilePalette as palette } from './palette'

type Props = {
  bio: string
  setBio: (value: string) => void
}

export default function ProfileBioSection({ bio, setBio }: Props) {
  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <SectionTitle text='一句话简介（选填）' />
      <View style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '12px', color: palette.subtext }}>其他用户在地图上点击你的标记后会看到这句话</Text>
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
        <Textarea value={bio} placeholder='简单介绍一下自己...' maxlength={200} onInput={(e) => setBio(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '60px' }} />
      </View>
      <View style={{ marginTop: '4px' }}>
        <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{bio.length}/200</Text>
      </View>
    </View>
  )
}
