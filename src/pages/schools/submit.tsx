import { useMemo, useState } from 'react'
import { View, Text, Input, Textarea, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
}

const LOCATION_DATA: Record<string, string[]> = {
  '北京': ['北京'], '上海': ['上海'], '天津': ['天津'], '重庆': ['重庆'],
  '广东': ['广州', '深圳', '珠海', '佛山', '东莞', '中山', '惠州', '其他'],
  '浙江': ['杭州', '宁波', '温州', '绍兴', '嘉兴', '金华', '台州', '湖州', '丽水', '衢州', '其他'],
  '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州', '其他'],
  '四川': ['成都', '绵阳', '德阳', '宜宾', '南充', '乐山', '广元', '其他'],
  '福建': ['福州', '厦门', '泉州', '漳州', '莆田', '其他'],
  '山东': ['济南', '青岛', '烟台', '潍坊', '临沂', '威海', '其他'],
  '湖北': ['武汉', '宜昌', '襄阳', '荆州', '其他'],
  '湖南': ['长沙', '株洲', '湘潭', '衡阳', '岳阳', '郴州', '其他'],
  '河南': ['郑州', '洛阳', '开封', '南阳', '其他'],
  '河北': ['石家庄', '唐山', '保定', '邯郸', '衡水', '其他'],
  '安徽': ['合肥', '芜湖', '蚌埠', '阜阳', '宣城', '其他'],
  '陕西': ['西安', '咸阳', '宝鸡', '延安', '其他'],
  '江西': ['南昌', '赣州', '九江', '景德镇', '其他'],
  '广西': ['南宁', '柳州', '桂林', '北海', '其他'],
  '云南': ['昆明', '大理', '丽江', '玉溪', '曲靖', '其他'],
  '贵州': ['贵阳', '遵义', '六盘水', '其他'],
  '山西': ['太原', '大同', '运城', '其他'],
  '辽宁': ['沈阳', '大连', '鞍山', '其他'],
  '吉林': ['长春', '吉林市', '延边', '通化', '其他'],
  '黑龙江': ['哈尔滨', '大庆', '齐齐哈尔', '黑河', '其他'],
  '内蒙古': ['呼和浩特', '包头', '鄂尔多斯', '其他'],
  '新疆': ['乌鲁木齐', '喀什', '伊犁', '其他'],
  '西藏': ['拉萨', '林芝', '日喀则', '其他'],
  '甘肃': ['兰州', '天水', '酒泉', '其他'],
  '青海': ['西宁', '海东', '其他'],
  '宁夏': ['银川', '吴忠', '其他'],
  '海南': ['海口', '三亚', '澄迈', '其他'],
  '香港': ['香港'], '澳门': ['澳门'],
  '台湾': ['台北', '新北', '高雄', '台中', '台南', '其他'],
  '海外': ['其他'],
}
const PROVINCES = Object.keys(LOCATION_DATA)
const COMMUNITY_TYPE_OPTIONS = ['项目制学习', '线下社区', '线上社区', '混合型', '家庭共学', '其他']
const AGE_RANGE_OPTIONS = ['学龄前', '小学阶段', '中学阶段', '混龄', '成人为主', '未注明']

function SectionTitle(props: { text: string }) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>{props.text}</Text>
    </View>
  )
}

function PillSelect(props: { options: string[]; selected: string; onChange: (val: string) => void }) {
  const { options, selected, onChange } = props
  return (
    <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
      {options.map((opt) => {
        const active = selected === opt
        return (
          <View key={opt} onClick={() => onChange(opt === selected ? '' : opt)} style={{
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
  const [city, setCity] = useState('')
  const [communityType, setCommunityType] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [participationNote, setParticipationNote] = useState('')
  const [feeNote, setFeeNote] = useState('')
  const [sourceNote, setSourceNote] = useState('')
  const [recommendationNote, setRecommendationNote] = useState('')

  const pickerRange = useMemo(() => {
    const cities = province ? (LOCATION_DATA[province] || ['其他']) : ['请先选择省份']
    return [PROVINCES, cities]
  }, [province])
  const pickerValue = useMemo(() => {
    const provIdx = Math.max(0, PROVINCES.indexOf(province))
    const cities = province ? (LOCATION_DATA[province] || []) : []
    return [provIdx, Math.max(0, cities.indexOf(city))]
  }, [province, city])

  const handlePickerChange = (e: any) => {
    const [provIdx, cityIdx] = e.detail.value
    const nextProvince = PROVINCES[provIdx] || ''
    const cities = LOCATION_DATA[nextProvince] || []
    setProvince(nextProvince)
    setCity(cities[cityIdx] || '')
  }

  const handlePickerColumnChange = (e: any) => {
    if (e.detail.column === 0) {
      const nextProvince = PROVINCES[e.detail.value] || ''
      setProvince(nextProvince)
      setCity((LOCATION_DATA[nextProvince] || [])[0] || '')
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请填写学习社区名称', icon: 'none' })
      return
    }
    if (!province || !city) {
      Taro.showToast({ title: '请选择所在城市', icon: 'none' })
      return
    }

    try {
      setSubmitting(true)
      const res: any = await Taro.cloud.callFunction({
        name: 'submitCommunity',
        data: {
          name: name.trim(),
          province,
          city,
          communityType,
          ageRange,
          officialUrl: officialUrl.trim(),
          participationNote: participationNote.trim(),
          feeNote: feeNote.trim(),
          sourceNote: sourceNote.trim(),
          recommendationNote: recommendationNote.trim(),
        },
      })
      const result = res.result
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
            提交公开可验证的信息，帮助更多家庭发现新的学习社区。请优先填写官网或公开链接，不要提交私密联系方式。
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
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>
              {province && city ? `${province} · ${city}` : '点击选择省份和城市'}
            </Text>
            <Text style={{ fontSize: '12px', color: palette.subtext }}>▼</Text>
          </View>
        </Picker>

        <SectionTitle text='社区类型（选填）' />
        <PillSelect options={COMMUNITY_TYPE_OPTIONS} selected={communityType} onChange={setCommunityType} />

        <SectionTitle text='适合阶段（选填）' />
        <PillSelect options={AGE_RANGE_OPTIONS} selected={ageRange} onChange={setAgeRange} />

        <SectionTitle text='官网或公开链接（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={officialUrl} placeholder='https://...' onInput={(e) => setOfficialUrl(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
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
          🔒 你的提交会先进入审核，不会自动公开。请只提交公开可验证的信息，不要填写私人微信号、手机号或未公开的未成年人信息。
        </Text>
      </View>

      <View onClick={submitting ? undefined : handleSubmit} style={{ backgroundColor: submitting ? '#DDD' : palette.accentDeep, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '30px' }}>
        <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>{submitting ? '提交中...' : '提交推荐'}</Text>
      </View>
    </View>
  )
}
