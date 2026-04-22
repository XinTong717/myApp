import { View, Text, Textarea } from '@tarojs/components'
import { profilePalette as palette } from './palette'

type Props = {
  eduServices: string
  setEduServices: (value: string) => void
}

export default function ProfileEducatorSection({ eduServices, setEduServices }: Props) {
  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <View style={{ marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>你提供的教育服务</Text>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>帮助家庭了解你能提供什么样的支持</Text>
        </View>
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
        <Textarea value={eduServices} placeholder='比如：一对一升学规划咨询...' maxlength={500} onInput={(e) => setEduServices(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '90px' }} />
      </View>
      <View style={{ marginTop: '4px', marginBottom: '8px' }}>
        <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{eduServices.length}/500</Text>
      </View>
    </View>
  )
}
