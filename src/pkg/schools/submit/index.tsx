import { useMemo, useState } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../../constants/location'
import { submitCommunity } from '../../../services/school'
import SectionTitle from '../../../components/profile/SectionTitle'
import { palette } from '../../../theme/palette'

const COMMUNITY_TYPE_OPTIONS = ['项目制学习', '线下社区', '线上社区', '混合型', '家庭共学', '其他']
const AGE_RANGE_OPTIONS = ['学龄前', '小学阶段', '中学阶段', '混龄', '成人为主', '其他']

function MultiPillSelect(props: { options: string[]; selected: string[]; onChange: (val: string[]) => void }) {
  const { options, selected, onChange } = props
  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <View key={opt} onClick={() => onChange(active ? selected.filter((v) => v !== opt) : [...selected, opt])} style={{
            padding: '6px 14px', borderRadius: '999px', marginRight: '8px', marginBottom: '8px',
            backgroundColor: active ? palette.accentDeep : '#F5F0EB',
            border: `1px solid ${active ? palette.accentDeep : palette.line}`,
          }}>
            <Text style={{ fontSize: '13px', color: active ? '#FFF' : palette.subtext }}>{opt}</Text>
          </View>
        )
      })}
    </View>
  )
}

export default function SubmitCommunityPage() {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [communityType, setCommunityType] = useState<string[]>([])
  const [communityTypeOther, setCommunityTypeOther] = useState('')
  const [ageRange, setAgeRange] = useState<string[]>([])
  const [ageRangeOther, setAgeRangeOther] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [participationNote, setParticipationNote] = useState('')
  const [feeNote, setFeeNote] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [recommendationNote, setRecommendationNote] = useState('')

  const currentCity = cityOption === '其他' ? customCity.trim() : cityOption

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])
  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    const normalizedCityOption = cityOption || (cities[0] || '')
    return [provIdx, Math.max(0, cities.indexOf(normalizedCityOption))]
  }, [province, cityOption])

  const handlePickerChange = (e: any) => {
    const [provIdx, cityIdx] = e.detail.value
    const nextProvince = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[nextProvince] || []
    const nextCityOption = cities[cityIdx] || ''
    setProvince(nextProvince)
    setCityOption(nextCityOption)
    if (nextCityOption !== '其他') setCustomCity('')
  }

  const handlePickerColumnChange = (e: any) => {
    if (e.detail.column === 0) {
      const nextProvince = PROVINCES[e.detail.value] || ''
      const firstCity = (LOCATION_DATA[nextProvince] || [])[0] || ''
      setProvince(nextProvince)
      setCityOption(firstCity)
      setCustomCity('')
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请填写学习社区名称', icon: 'none' })
      return
    }
    if (!province || !currentCity) {
      Taro.showToast({ title: '请选择所在城市', icon: 'none' })
      return
    }
    if (cityOption === '其他' && !customCity.trim()) {
      Taro.showToast({ title: '请输入真实城市名', icon: 'none' })
      return
    }
    if (communityType.includes('其他') && !communityTypeOther.trim()) {
      Taro.showToast({ title: '请补充社区类型中的“其他”', icon: 'none' })
      return
    }
    if (ageRange.includes('其他') && !ageRangeOther.trim()) {
      Taro.showToast({ title: '请补充适合阶段中的“其他”', icon: 'none' })
      return
    }

    const confirm = await Taro.showModal({
      title: '提交推荐',
      content: '提交后将进入人工审核队列，审核通过后才会出现在学习社区列表中。',
      confirmText: '确认提交',
      cancelText: '再看看',
    })
    if (!confirm.confirm) return

    try {
      setSubmitting(true)
      const result = await submitCommunity({
        name: name.trim(),
        province,
        city: currentCity,
        communityType,
        communityTypeOther: communityType.includes('其他') ? communityTypeOther.trim() : '',
        ageRange,
        ageRangeOther: ageRange.includes('其他') ? ageRangeOther.trim() : '',
        officialUrl: officialUrl.trim(),
        participationNote: participationNote.trim(),
        feeNote: feeNote.trim(),
        sourceNote: sourceNote.trim(),
        recommendationNote: recommendationNote.trim(),
      })
      if (result?.ok) {
        Taro.showToast({ title: '提交成功，感谢推荐', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 700)
      } else {
        Taro.showToast({ title: result?.message || '提交失败', icon: 'none' })
      }
    } catch (err) {
      console.error('submitCommunity error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{
        backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px',
        marginBottom: '14px', border: `1px solid ${palette.line}`,
      }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>推荐新学习社区</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            提交公开可验证的信息，帮助更多家庭发现新的学习社区。请优先填写公开主页、公众号或小红书，不要填写第三方未公开的私人联系方式。
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', border: `1px solid ${palette.line}` }}>
        <SectionTitle text='学习社区名称' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={name} placeholder='例如：某某共学社区' onInput={(e) => setName(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: cityOption === '其他' ? '8px' : '16px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>
              {province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}
            </Text>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>▼</Text>
          </View>
        </Picker>
        {cityOption === '其他' && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表里会显示你填写的城市。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onInput={(e) => setCustomCity(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='社区类型（可多选）' />
        <MultiPillSelect options={COMMUNITY_TYPE_OPTIONS} selected={communityType} onChange={setCommunityType} />
        {communityType.includes('其他') && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>补充社区类型中的“其他”。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={communityTypeOther} placeholder='例如：森林学校 / 驻留计划' onInput={(e) => setCommunityTypeOther(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='适合阶段（可多选）' />
        <MultiPillSelect options={AGE_RANGE_OPTIONS} selected={ageRange} onChange={setAgeRange} />
        {ageRange.includes('其他') && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>补充适合阶段中的“其他”。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={ageRangeOther} placeholder='例如：大学生 / 家庭混龄共学' onInput={(e) => setAgeRangeOther(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='公开主页 / 官网 / 公众号 / 小红书（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={officialUrl} placeholder='https://... 或公众号名称 / 小红书账号' onInput={(e) => setOfficialUrl(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='参与方式说明（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Textarea value={participationNote} placeholder='例如：线下驻留、周末活动、线上项目制等' maxlength={300} onInput={(e) => setParticipationNote(e.detail.value)} style={{ width: '100%', minHeight: '70px', fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='参考费用（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Textarea value={feeNote} placeholder='例如：按月、按学期、按活动收费，或未公开' maxlength={200} onInput={(e) => setFeeNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='你从哪里知道它（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Textarea value={sourceNote} placeholder='例如：官网、朋友推荐、公开文章、线下探访' maxlength={200} onInput={(e) => setSourceNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='推荐理由 / 补充说明（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '8px', border: `1px solid ${palette.line}` }}>
          <Textarea value={recommendationNote} placeholder='补充任何有助于审核的信息，比如公开活动、特色、适合什么样的家庭等' maxlength={500} onInput={(e) => setRecommendationNote(e.detail.value)} style={{ width: '100%', minHeight: '90px', fontSize: '14px', color: palette.text }} />
        </View>
        <View style={{ marginBottom: '16px' }}>
          <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{recommendationNote.length}/500</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '16px', padding: '12px 14px', marginTop: '14px', marginBottom: '20px', border: `1px dashed ${palette.line}` }}>
        <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
          🔒 你的提交会先进入审核，不会自动公开。请只提交公开可验证的信息，不要填写第三方未公开的私人联系方式或未公开的未成年人信息。
        </Text>
      </View>

      <View onClick={submitting ? undefined : handleSubmit} style={{ backgroundColor: submitting ? '#DDD' : palette.accentDeep, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '30px' }}>
        <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>{submitting ? '提交中...' : '提交推荐'}</Text>
      </View>
    </View>
  )
}
