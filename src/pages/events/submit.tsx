import { useMemo, useState } from 'react'
import { View, Text, Input, Textarea, Picker, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { LOCATION_DATA, PROVINCES } from '../../constants/location'

const palette = {
  bg: '#FFF9F2',
  card: '#FFFFFF',
  text: '#2F241B',
  subtext: '#7A6756',
  accentDeep: '#E76F51',
  accentSoft: '#FCE6D6',
  line: '#F1DFCF',
}

const EVENT_TYPE_OPTIONS = ['圆桌讨论', '工作坊', '线下聚会', '线上活动', '家庭活动', '项目招募', '其他']
const AUDIENCE_OPTIONS = ['家长', '教育者', '青少年', '亲子共同参与', '公众开放', '其他']
const FEE_OPTIONS = ['免费', '付费', '公益捐赠', '费用待确认']

function SectionTitle(props: { text: string }) {
  return (
    <View style={{ marginBottom: '6px' }}>
      <Text style={{ fontSize: '13px', color: palette.accentDeep, fontWeight: 'bold' }}>{props.text}</Text>
    </View>
  )
}

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

function combineDateTime(date: string, time: string) {
  if (!date || !time) return ''
  return new Date(`${date}T${time}:00`).toISOString()
}

export default function SubmitEventPage() {
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [province, setProvince] = useState('')
  const [cityOption, setCityOption] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [eventTypeOther, setEventTypeOther] = useState('')
  const [audience, setAudience] = useState<string[]>([])
  const [audienceOther, setAudienceOther] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState('')
  const [fee, setFee] = useState('')
  const [feeDetail, setFeeDetail] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [signupNote, setSignupNote] = useState('')
  const [description, setDescription] = useState('')

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
    if (!title.trim()) {
      Taro.showToast({ title: '请填写活动标题', icon: 'none' })
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
    if (eventTypes.includes('其他') && !eventTypeOther.trim()) {
      Taro.showToast({ title: '请补充活动类型中的“其他”', icon: 'none' })
      return
    }
    if (audience.includes('其他') && !audienceOther.trim()) {
      Taro.showToast({ title: '请补充面向对象中的“其他”', icon: 'none' })
      return
    }
    if (!startDate || !startTime) {
      Taro.showToast({ title: '请完整填写开始时间', icon: 'none' })
      return
    }
    if ((endDate && !endTime) || (!endDate && endTime)) {
      Taro.showToast({ title: '结束日期和时间请一起填写', icon: 'none' })
      return
    }
    if (!fee) {
      Taro.showToast({ title: '请选择费用情况', icon: 'none' })
      return
    }
    if (fee === '付费' && !feeDetail.trim()) {
      Taro.showToast({ title: '请补充付费说明', icon: 'none' })
      return
    }
    if (!organizer.trim()) {
      Taro.showToast({ title: '请填写组织者', icon: 'none' })
      return
    }
    if (!description.trim()) {
      Taro.showToast({ title: '请填写活动简介', icon: 'none' })
      return
    }

    const confirm = await Taro.showModal({
      title: '提交活动',
      content: '提交后会进入人工审核队列，审核通过后才会出现在活动列表中。你可以发布自己组织的活动，也可以推荐公开活动。',
      confirmText: '确认提交',
      cancelText: '再看看',
    })
    if (!confirm.confirm) return

    try {
      setSubmitting(true)
      const res: any = await Taro.cloud.callFunction({
        name: 'submitEvent',
        data: {
          title: title.trim(),
          province,
          city: currentCity,
          eventTypes,
          eventTypeOther: eventTypes.includes('其他') ? eventTypeOther.trim() : '',
          audience,
          audienceOther: audience.includes('其他') ? audienceOther.trim() : '',
          startTime: combineDateTime(startDate, startTime),
          endTime: endDate && endTime ? combineDateTime(endDate, endTime) : '',
          isOnline,
          location: location.trim(),
          fee,
          feeDetail: fee === '付费' ? feeDetail.trim() : '',
          organizer: organizer.trim(),
          officialUrl: officialUrl.trim(),
          signupNote: signupNote.trim(),
          description: description.trim(),
        },
      })
      const result = res.result
      if (result?.ok) {
        Taro.showToast({ title: '提交成功', icon: 'success' })
        setTimeout(() => {
          Taro.navigateBack()
        }, 700)
      } else {
        Taro.showToast({ title: result?.message || '提交失败', icon: 'none' })
      }
    } catch (err) {
      console.error('submitEvent error:', err)
      Taro.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '18px 16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
        <Text style={{ fontSize: '22px', fontWeight: 'bold', color: palette.text }}>发布或推荐活动</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '20px' }}>
            你可以提交自己组织的活动，也可以推荐你认为值得被看见的公开活动。请优先填写公开链接和公开报名方式。
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', border: `1px solid ${palette.line}` }}>
        <SectionTitle text='活动标题' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={title} placeholder='例如：杭州家长圆桌讨论' onInput={(e) => setTitle(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='所在城市' />
        <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: cityOption === '其他' ? '8px' : '16px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text>
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

        <SectionTitle text='活动类型（可多选）' />
        <MultiPillSelect options={EVENT_TYPE_OPTIONS} selected={eventTypes} onChange={setEventTypes} />
        {eventTypes.includes('其他') && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>补充活动类型中的“其他”。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={eventTypeOther} placeholder='例如：读书会 / 展映 / 体验营' onInput={(e) => setEventTypeOther(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='面向对象（可多选）' />
        <MultiPillSelect options={AUDIENCE_OPTIONS} selected={audience} onChange={setAudience} />
        {audience.includes('其他') && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>补充面向对象中的“其他”。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={audienceOther} placeholder='例如：大学生 / 创作者 / 社区志愿者' onInput={(e) => setAudienceOther(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='开始时间' />
        <View style={{ display: 'flex', flexDirection: 'row', marginBottom: '12px' }}>
          <Picker mode='date' value={startDate} onChange={(e) => setStartDate(e.detail.value)}>
            <View style={{ flex: 1, backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}`, marginRight: '8px' }}>
              <Text style={{ fontSize: '14px', color: startDate ? palette.text : '#C5B5A5' }}>{startDate || '选择日期'}</Text>
            </View>
          </Picker>
          <Picker mode='time' value={startTime} onChange={(e) => setStartTime(e.detail.value)}>
            <View style={{ width: '120px', backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Text style={{ fontSize: '14px', color: startTime ? palette.text : '#C5B5A5' }}>{startTime || '选择时间'}</Text>
            </View>
          </Picker>
        </View>

        <SectionTitle text='结束时间（选填）' />
        <View style={{ display: 'flex', flexDirection: 'row', marginBottom: '16px' }}>
          <Picker mode='date' value={endDate} onChange={(e) => setEndDate(e.detail.value)}>
            <View style={{ flex: 1, backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}`, marginRight: '8px' }}>
              <Text style={{ fontSize: '14px', color: endDate ? palette.text : '#C5B5A5' }}>{endDate || '选择日期'}</Text>
            </View>
          </Picker>
          <Picker mode='time' value={endTime} onChange={(e) => setEndTime(e.detail.value)}>
            <View style={{ width: '120px', backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Text style={{ fontSize: '14px', color: endTime ? palette.text : '#C5B5A5' }}>{endTime || '选择时间'}</Text>
            </View>
          </Picker>
        </View>

        <SectionTitle text='线上活动' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '12px', marginBottom: '16px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: '14px', color: palette.text }}>{isOnline ? '是，主要在线上进行' : '否，主要在线下进行'}</Text>
          <Switch checked={isOnline} color={palette.accentDeep} onChange={(e) => setIsOnline(!!e.detail.value)} />
        </View>

        <SectionTitle text={isOnline ? '平台 / 线上说明（选填）' : '地点说明（选填）'} />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={location} placeholder={isOnline ? '例如：腾讯会议 / Zoom' : '例如：杭州西湖区某空间'} onInput={(e) => setLocation(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='费用' />
        <MultiPillSelect options={FEE_OPTIONS} selected={fee ? [fee] : []} onChange={(values) => {
          const nextFee = values[values.length - 1] || ''
          setFee(nextFee)
          if (nextFee !== '付费') setFeeDetail('')
        }} />
        {fee === '付费' && (
          <View style={{ marginBottom: '16px' }}>
            <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>补充费用说明，例如：单次 49 元 / 四次 199 元。</Text></View>
            <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
              <Input value={feeDetail} placeholder='例如：单次 49 元' onInput={(e) => setFeeDetail(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
            </View>
          </View>
        )}

        <SectionTitle text='组织者' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
          <Input value={organizer} placeholder='例如：自由学社 / 某教育团队 / 个人发起者' onInput={(e) => setOrganizer(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='公开链接（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Input value={officialUrl} placeholder='https://...' onInput={(e) => setOfficialUrl(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='报名方式说明（选填）' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
          <Textarea value={signupNote} placeholder='例如：表单链接、公开主页说明或其他公开报名方式' maxlength={200} onInput={(e) => setSignupNote(e.detail.value)} style={{ width: '100%', minHeight: '60px', fontSize: '14px', color: palette.text }} />
        </View>

        <SectionTitle text='活动简介' />
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '8px', border: `1px solid ${palette.line}` }}>
          <Textarea value={description} placeholder='介绍活动内容、适合谁、预计会发生什么。请尽量填写结构化和公开可验证的信息。' maxlength={600} onInput={(e) => setDescription(e.detail.value)} style={{ width: '100%', minHeight: '120px', fontSize: '14px', color: palette.text }} />
        </View>
        <View style={{ marginBottom: '16px' }}>
          <Text style={{ fontSize: '11px', color: '#C5B5A5' }}>{description.length}/600</Text>
        </View>
      </View>

      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '16px', padding: '12px 14px', marginTop: '14px', marginBottom: '20px', border: `1px dashed ${palette.line}` }}>
        <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
          🔒 提交内容不会自动公开。请只填写公开可验证的活动，不要填写第三方未公开的私人联系方式或未公开的未成年人信息。
        </Text>
      </View>

      <View onClick={submitting ? undefined : handleSubmit} style={{ backgroundColor: submitting ? '#DDD' : palette.accentDeep, borderRadius: '16px', padding: '14px', textAlign: 'center', marginBottom: '30px' }}>
        <Text style={{ fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>{submitting ? '提交中...' : '提交活动'}</Text>
      </View>
    </View>
  )
}
