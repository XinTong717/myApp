import { View, Text, Textarea } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import PillSelect from './PillSelect'
import { profilePalette as palette } from './palette'

type Props = {
  childAgeRange: string[]
  setChildAgeRange: (value: string[]) => void
  childDropoutStatus: string[]
  setChildDropoutStatus: (value: string[]) => void
  childInterests: string
  setChildInterests: (value: string) => void
  childAgeOptions: string[]
  childStatusOptions: string[]
}

export default function ProfileParentSection(props: Props) {
  const {
    childAgeRange,
    setChildAgeRange,
    childDropoutStatus,
    setChildDropoutStatus,
    childInterests,
    setChildInterests,
    childAgeOptions,
    childStatusOptions,
  } = props

  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <View style={{ marginBottom: '10px' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold', color: palette.text }}>家庭教育关注</Text>
        <View style={{ marginTop: '4px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>仅在你主动同意联络请求后展示，用于帮助对方理解你当前在寻找什么支持</Text>
        </View>
      </View>
      <SectionTitle text='孩子学段（可多选）' />
      <PillSelect options={childAgeOptions} selected={childAgeRange} multi onChange={(v) => setChildAgeRange(v as string[])} />
      <SectionTitle text='当前关注方向（可多选）' />
      <PillSelect options={childStatusOptions} selected={childDropoutStatus} multi onChange={(v) => setChildDropoutStatus(v as string[])} />
      <SectionTitle text='希望补充说明的情况' />
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
        <Textarea value={childInterests} placeholder='比如：希望找线下同伴、项目制活动，或更适合当前阶段的学习支持...' maxlength={300} onInput={(e) => setChildInterests(e.detail.value)} style={{ fontSize: '14px', color: palette.text, width: '100%', minHeight: '70px' }} />
      </View>
      <View style={{ marginTop: '4px', marginBottom: '8px' }}>
        <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{childInterests.length}/300</Text>
      </View>
    </View>
  )
}
