import { Text, View } from '@tarojs/components'
import { palette } from '../../../theme/palette'
import { radius, space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'
import { exploreTheme } from '../styles'
import type { MarkerItem } from '../types'
import { Tag } from './Chips'

type UserPopupProps = {
  user: MarkerItem | null
  popupRoleText: string
  hasProfile: boolean
  onClose: () => void
  onPrimaryAction: () => void
  onReport: (targetUserId: string) => void
  onBlock: (targetUserId: string) => void
}

const sheetStyle = {
  width: '100%',
  backgroundColor: exploreTheme.surface,
  borderTopLeftRadius: radius.md,
  borderTopRightRadius: radius.md,
  padding: `${space(4)} ${space(4)} ${space(6)}`,
  boxSizing: 'border-box',
  borderTop: `1px solid ${exploreTheme.border}`,
} as const

const panelStyle = {
  backgroundColor: exploreTheme.surface,
  borderRadius: radius.md,
  padding: `${space(3)} ${space(3)}`,
  border: `1px solid ${exploreTheme.border}`,
} as const

function SheetButton(props: { text: string; tone: 'primary' | 'ghost' | 'danger'; disabled?: boolean; onClick?: () => void }) {
  const isPrimary = props.tone === 'primary'
  const isDanger = props.tone === 'danger'
  return (
    <View
      onClick={props.disabled ? undefined : props.onClick}
      style={{
        backgroundColor: props.disabled ? exploreTheme.tag : isPrimary ? palette.brand : isDanger ? palette.errorSoft : exploreTheme.tag,
        borderRadius: radius.md,
        padding: space(3),
        textAlign: 'center',
        border: isPrimary ? 'none' : `1px solid ${isDanger ? palette.errorSoft : exploreTheme.border}`,
        opacity: props.disabled ? 0.72 : 1,
      }}
    >
      <Text style={{ ...typography.button, color: props.disabled ? exploreTheme.muted : isPrimary ? palette.card : isDanger ? palette.error : exploreTheme.tagText }}>
        {props.text}
      </Text>
    </View>
  )
}

function InfoBlock(props: { title: string; text?: string | string[] }) {
  const lines = Array.isArray(props.text) ? props.text.filter(Boolean) : [props.text].filter(Boolean)
  if (lines.length === 0) return null
  return (
    <View style={{ marginTop: space(3) }}>
      <Text style={{ ...typography.caption, color: palette.brand }}>{props.title}</Text>
      <View style={{ marginTop: space(1) }}>
        {lines.map((line) => <View key={line} style={{ marginBottom: space(1) }}><Text style={{ ...typography.body, color: exploreTheme.text }}>{line}</Text></View>)}
      </View>
    </View>
  )
}

export default function UserPopup(props: UserPopupProps) {
  const { user, popupRoleText, hasProfile, onClose, onPrimaryAction, onReport, onBlock } = props

  if (!user) return null

  const canSeeExpanded = !!user.hasExpandedProfile
  const hasExpandedContent = canSeeExpanded && !!(
    user.contactId || user.contactNote || user.childAgeRange?.length || user.childDropoutStatus?.length || user.childInterests || user.eduServices
  )

  return (
    <View onClick={onClose} style={{ position: 'fixed', left: '0', right: '0', top: '0', bottom: '0', backgroundColor: exploreTheme.overlay, display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <View onClick={(e: any) => e?.stopPropagation?.()} style={sheetStyle}>
        <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', marginBottom: space(3) }}>
          <View style={{ flex: 1, paddingRight: space(3) }}>
            <Text style={{ ...typography.title, color: exploreTheme.text }}>{user.name}</Text>
            <View style={{ marginTop: space(2), display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
              {user.city ? <Tag text={user.city} tone='brand' /> : null}
              {popupRoleText ? <Tag text={popupRoleText} tone='user' /> : null}
              {user.isSelf ? <Tag text='这是你自己' /> : null}
              {canSeeExpanded && !user.isSelf ? <Tag text='扩展资料可见' /> : null}
            </View>
          </View>
          <View onClick={onClose} style={{ width: space(7), height: space(7), borderRadius: radius.pill, backgroundColor: exploreTheme.tag, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ ...typography.sectionTitle, color: exploreTheme.tagText }}>✕</Text>
          </View>
        </View>

        {(user.companionContext || user.bio) ? (
          <View style={{ ...panelStyle, marginBottom: space(4) }}>
            <InfoBlock title='和这个生态的关系' text={user.companionContext} />
            <InfoBlock title='简介' text={user.bio} />
          </View>
        ) : (
          <View style={{ ...panelStyle, marginBottom: space(4) }}>
            <Text style={{ ...typography.body, color: exploreTheme.subtext }}>这位同路人还没有填写更多公开介绍。</Text>
          </View>
        )}

        {hasExpandedContent ? (
          <View style={{ ...panelStyle, marginBottom: space(4) }}>
            <InfoBlock title='公开渠道' text={user.contactId} />
            <InfoBlock title='添加备注说明' text={user.contactNote} />
            <InfoBlock title='家庭教育关注' text={[...(user.childAgeRange || []), ...(user.childDropoutStatus || []), user.childInterests || '']} />
            <InfoBlock title='教育服务' text={user.eduServices} />
          </View>
        ) : null}

        {!hasProfile && !user.isSelf ? (
          <View style={{ backgroundColor: palette.accent2Soft, borderRadius: radius.md, padding: space(3), marginBottom: space(3), border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ ...typography.meta, color: exploreTheme.subtext }}>完成“我的资料”后，可查看成员目录中的扩展公开资料。平台不提供私信、好友申请或站内撮合。</Text>
          </View>
        ) : null}

        {hasProfile && !hasExpandedContent && !user.isSelf ? (
          <View style={{ backgroundColor: palette.cardSoft, borderRadius: radius.md, padding: space(3), marginBottom: space(3), border: `1px solid ${exploreTheme.border}` }}>
            <Text style={{ ...typography.meta, color: exploreTheme.subtext }}>这位用户暂未填写扩展公开资料。你仍可通过公开简介了解 TA。</Text>
          </View>
        ) : null}

        {user.isSelf ? <SheetButton text='去看我的资料' tone='ghost' onClick={onPrimaryAction} /> : !hasProfile ? <SheetButton text='去填写资料' tone='primary' onClick={onPrimaryAction} /> : null}

        {!user.isSelf && (
          <View style={{ display: 'flex', flexDirection: 'row', marginTop: user.isSelf || !hasProfile ? space(3) : 0 }}>
            <View style={{ flex: 1, marginRight: space(2) }}>
              <SheetButton text='举报' tone='ghost' onClick={() => onReport(String(user.originalId))} />
            </View>
            <View style={{ flex: 1 }}>
              <SheetButton text='拉黑' tone='danger' onClick={() => onBlock(String(user.originalId))} />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
