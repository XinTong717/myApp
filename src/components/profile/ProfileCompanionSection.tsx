import { View, Text, Textarea } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  companionContext: string
  setCompanionContext: (value: string) => void
}

export default function ProfileCompanionSection({ companionContext, setCompanionContext }: Props) {
  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <View style={{ marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你和这个生态的关系</Text>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>比如：研究者、gap year、内容创作者、社区组织者、观察者等。这个说明会帮助别人理解你为什么在这里。</Text>
        </View>
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
        <Textarea value={companionContext} placeholder='例如：gap year 中，长期关注多元教育与社区学习' maxlength={150} onInput={(e) => setCompanionContext(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
      </View>
      <View style={{ marginTop: '4px', marginBottom: '8px' }}>
        <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{companionContext.length}/150</Text>
      </View>
    </View>
  )
}
