import { useState } from 'react'
import { Textarea } from '@tarojs/components'
import SectionTitle from './SectionTitle'
import { MultiPillSelect } from '../common/PillSelect'
import ProfileCard from './ProfileCard'
import ProfileInputBox from './ProfileInputBox'
import ProfileHelperText from './ProfileHelperText'
import ProfileCounterText from './ProfileCounterText'
import ProfileSectionHeading from './ProfileSectionHeading'
import { palette } from '../../theme/palette'
import { typography } from '../../theme/typography'

type Props = {
  childAgeRange: string[]
  setChildAgeRange: (value: string[]) => void
  childDropoutStatus: string[]
  setChildDropoutStatus: (value: string[]) => void
  childInterests: string
  setChildInterests: (value: string) => void
  childAgeOptions: readonly string[]
  childStatusOptions: readonly string[]
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
  const [focused, setFocused] = useState(false)

  return (
    <ProfileCard>
      <ProfileSectionHeading
        title='家庭教育关注'
        description='仅在你主动同意联络请求后展示，用于帮助对方理解你当前在寻找什么支持'
      />
      <SectionTitle text='孩子学段（可多选）' />
      <MultiPillSelect options={childAgeOptions} selected={childAgeRange} onChange={setChildAgeRange} />
      <SectionTitle text='当前关注方向（可多选）' />
      <MultiPillSelect options={childStatusOptions} selected={childDropoutStatus} onChange={setChildDropoutStatus} />
      <SectionTitle text='希望补充说明的情况' />
      <ProfileHelperText text='比如：希望找线下同伴、项目制活动，或更适合当前阶段的学习支持。' marginBottom='6px' />
      <ProfileInputBox marginBottom='0' focused={focused}>
        <Textarea
          value={childInterests}
          placeholder='比如：希望找线下同伴、项目制活动，或更适合当前阶段的学习支持...'
          maxlength={300}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onInput={(e) => setChildInterests(e.detail.value)}
          style={{ ...typography.body, color: palette.text, width: '100%', minHeight: '70px' }}
        />
      </ProfileInputBox>
      <ProfileCounterText current={childInterests.length} max={300} />
    </ProfileCard>
  )
}
