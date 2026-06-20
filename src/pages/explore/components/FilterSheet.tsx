import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { CHILD_AGE_OPTIONS } from '../../../constants/profile'
import AppPrimaryButton from '../../../components/common/AppPrimaryButton'
import { exploreTheme } from '../styles'
import type { ProfileCompletenessFilter, UserRoleFilter } from '../types'
import { FilterChip } from './Chips'

type FilterSheetProps = {
  visible: boolean
  selectedUserRole?: UserRoleFilter | string
  setSelectedUserRole?: (role: UserRoleFilter | string) => void
  selectedUserRoles?: UserRoleFilter[]
  setSelectedUserRoles?: (roles: UserRoleFilter[]) => void
  selectedChildAgeRange?: string
  setSelectedChildAgeRange?: (stage: string) => void
  selectedChildAgeRanges?: string[]
  setSelectedChildAgeRanges?: (stages: string[]) => void
  selectedProfileCompleteness: ProfileCompletenessFilter
  setSelectedProfileCompleteness: (value: ProfileCompletenessFilter) => void
  selectedUserCity: string
  setSelectedUserCity: (city: string) => void
  userCityOptions: string[]
  onReset?: () => void
  onClose: () => void
}

const ROLE_OPTIONS: UserRoleFilter[] = ['家长', '教育者', '同行者']

function splitEncodedFilters(value?: string) {
  return String(value || '')
    .split(/[、,，/|｜\s]+/)
    .map((item) => item.trim())
    .filter((item) => item && item !== '全部')
}

function unique<T extends string>(values: T[]) {
  return Array.from(new Set(values))
}

function toggleOption<T extends string>(current: T[], option: T) {
  return current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
}

export default function FilterSheet(props: FilterSheetProps) {
  const {
    visible,
    selectedProfileCompleteness,
    setSelectedProfileCompleteness,
    selectedUserCity,
    setSelectedUserCity,
    onClose,
  } = props

  const selectedUserRoles = props.selectedUserRoles || unique(splitEncodedFilters(props.selectedUserRole).filter((item) => ROLE_OPTIONS.includes(item as UserRoleFilter)) as UserRoleFilter[])
  const selectedChildAgeRanges = props.selectedChildAgeRanges || unique(splitEncodedFilters(props.selectedChildAgeRange))

  const setUserRoles = (roles: UserRoleFilter[]) => {
    const next = unique(roles)
    props.setSelectedUserRoles?.(next)
    props.setSelectedUserRole?.(next.length > 0 ? next.join(',') : '全部')
  }

  const setChildAgeRanges = (stages: string[]) => {
    const next = unique(stages)
    props.setSelectedChildAgeRanges?.(next)
    props.setSelectedChildAgeRange?.(next.length > 0 ? next.join(',') : '全部')
  }

  if (!visible) return null

  const resetClientOnlyFilters = () => {
    if (selectedProfileCompleteness !== '全部') setSelectedProfileCompleteness('全部')
    if (selectedUserCity !== '全部') setSelectedUserCity('全部')
  }

  const clearRoleFilters = () => {
    resetClientOnlyFilters()
    setUserRoles([])
    setChildAgeRanges([])
  }

  const toggleRole = (role: UserRoleFilter) => {
    resetClientOnlyFilters()
    const nextRoles = toggleOption(selectedUserRoles, role)
    setUserRoles(nextRoles)
    if (!nextRoles.includes('家长')) setChildAgeRanges([])
  }

  const clearChildAgeFilters = () => {
    resetClientOnlyFilters()
    setChildAgeRanges([])
  }

  const toggleChildAge = (stage: string) => {
    resetClientOnlyFilters()
    setChildAgeRanges(toggleOption(selectedChildAgeRanges, stage))
  }

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(event: any) => event?.stopPropagation?.()} style={{ width: '100%', backgroundColor: exploreTheme.surface, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, padding: `${space(4)} ${space(4)} ${space(6)}`, boxSizing: 'border-box', borderTop: `1px solid ${exploreTheme.border}` }}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: space(4) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.title, color: exploreTheme.text }}>筛选同路人</Text>
            <View style={{ marginTop: space(1) }}>
              <Text style={{ ...typography.caption, color: exploreTheme.subtext }}>身份和孩子学段会同步影响地图聚合数字；学习社区点位不受影响</Text>
            </View>
          </View>
          <View onClick={onClose} style={{ width: space(7), height: space(7), borderRadius: radius.pill, backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.sectionTitle, color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        <View style={{ marginBottom: space(4) }}>
          <Text style={{ ...typography.bodyStrong, color: palette.brand }}>身份</Text>
          <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) }}>
            <FilterChip key='全部' active={selectedUserRoles.length === 0} tone='neutral' text='全部' onClick={clearRoleFilters} />
            {ROLE_OPTIONS.map((role) => (
              <FilterChip
                key={role}
                active={selectedUserRoles.includes(role)}
                tone={role === '教育者' ? 'educator' : role === '家长' ? 'brand' : 'user'}
                text={role}
                onClick={() => toggleRole(role)}
              />
            ))}
          </View>
        </View>

        {selectedUserRoles.includes('家长') && (
          <View style={{ marginBottom: space(4) }}>
            <Text style={{ ...typography.bodyStrong, color: palette.brand }}>孩子学段</Text>
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: space(2) }}>
              <FilterChip key='全部' active={selectedChildAgeRanges.length === 0} tone='brand' text='全部' onClick={clearChildAgeFilters} />
              {CHILD_AGE_OPTIONS.map((stage) => (
                <FilterChip
                  key={stage}
                  active={selectedChildAgeRanges.includes(stage)}
                  tone='brand'
                  text={stage}
                  onClick={() => toggleChildAge(stage)}
                />
              ))}
            </View>
          </View>
        )}

        <AppPrimaryButton text='完成' variant='primary' size='md' marginBottom='0' onClick={onClose} />
      </View>
    </View>
  )
}
