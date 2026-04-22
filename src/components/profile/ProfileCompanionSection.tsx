import { View, Text, Textarea } from '@tarojs/components'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileCounterText from './ProfileCounterText'
import { profilePalette as palette } from './palette'

type Props = {
  companionContext: string
  setCompanionContext: (value: string) => void
}

export default function ProfileCompanionSection({ companionContext, setCompanionContext }: Props) {
  return (
    <ProfileCard>
      <View style={{ marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你和这个生态的关系</Text>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>比如：研究者、gap year、内容创作者、社区组织者、观察者等。这个说明会帮助别人理解你为什么在这里。</Text>
        </View>
      </View>
      <ProfileInputBox marginBottom='0'>
        <Textarea value={companionContext} placeholder='例如：gap year 中，长期关注多元教育与社区学习' maxlength={150} onInput={(e) => setCompanionContext(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
      </ProfileInputBox>
      <ProfileCounterText current={companionContext.length} max={150} />
    </ProfileCard>
  )
}
