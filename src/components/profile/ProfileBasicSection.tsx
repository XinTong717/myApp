import { View, Text, Input, Picker } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import PillSelect from './PillSelect'
import { profilePalette as palette } from './palette'

type Props = {
  displayName: string
  setDisplayName: (value: string) => void
  gender: string
  setGender: (value: string) => void
  ageRange: string
  setAgeRange: (value: string) => void
  roles: string[]
  setRoles: (value: string[]) => void
  province: string
  cityOption: string
  currentCity: string
  customCity: string
  setCustomCity: (value: string) => void
  wechatId: string
  setWechatId: (value: string) => void
  pickerRange: any[]
  pickerValue: number[]
  handlePickerChange: (e: any) => void
  handlePickerColumnChange: (e: any) => void
  genderOptions: string[]
  ageRangeOptions: string[]
  roleOptions: string[]
}

export default function ProfileBasicSection(props: Props) {
  const {
    displayName,
    setDisplayName,
    gender,
    setGender,
    ageRange,
    setAgeRange,
    roles,
    setRoles,
    province,
    cityOption,
    currentCity,
    customCity,
    setCustomCity,
    wechatId,
    setWechatId,
    pickerRange,
    pickerValue,
    handlePickerChange,
    handlePickerColumnChange,
    genderOptions,
    ageRangeOptions,
    roleOptions,
  } = props

  return (
    <View style={{ backgroundColor: palette.card, borderRadius: '20px', padding: '16px', marginBottom: '14px', border: `1px solid ${palette.line}` }}>
      <SectionTitle text='显示名' />
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '16px', border: `1px solid ${palette.line}` }}>
        <Input value={displayName} placeholder='你希望别人怎么称呼你' onInput={(e) => setDisplayName(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
      </View>

      <SectionTitle text='性别' />
      <PillSelect options={genderOptions} selected={gender} onChange={(v) => setGender(v as string)} />

      <SectionTitle text='年龄段' />
      <PillSelect options={ageRangeOptions} selected={ageRange} onChange={(v) => setAgeRange(v as string)} />

      <SectionTitle text='身份（可多选）' />
      <PillSelect options={roleOptions} selected={roles} multi onChange={(v) => setRoles(v as string[])} />

      <SectionTitle text='所在城市' />
      <Picker mode='multiSelector' range={pickerRange} value={pickerValue} onChange={handlePickerChange} onColumnChange={handlePickerColumnChange}>
        <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: cityOption === '其他' ? '8px' : '12px', border: `1px solid ${palette.line}`, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: '14px', flex: 1, color: province ? palette.text : '#C5B5A5' }}>{province && currentCity ? `${province} · ${currentCity}` : '点击选择省份和城市'}</Text>
          <Text style={{ fontSize: '12px', color: palette.subtext }}>▼</Text>
        </View>
      </Picker>
      {cityOption === '其他' && (
        <View style={{ marginBottom: '12px' }}>
          <View style={{ marginBottom: '6px' }}><Text style={{ fontSize: '12px', color: palette.subtext }}>请输入真实城市名。地图会先按省级近似坐标展示，但列表中会显示你填写的城市。</Text></View>
          <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', border: `1px solid ${palette.line}` }}>
            <Input value={customCity} placeholder='例如：义乌 / 凯里 / 唐山' onInput={(e) => setCustomCity(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
          </View>
        </View>
      )}

      <SectionTitle text='微信号（选填）' />
      <View style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '12px', color: palette.subtext }}>仅在你同意对方的联络请求后，对方才能看到你的微信号</Text>
      </View>
      <View style={{ backgroundColor: '#FFFDF9', borderRadius: '14px', padding: '10px 12px', marginBottom: '12px', border: `1px solid ${palette.line}` }}>
        <Input value={wechatId} placeholder='你的微信号' onInput={(e) => setWechatId(e.detail.value)} style={{ fontSize: '14px', color: palette.text }} />
      </View>
    </View>
  )
}
