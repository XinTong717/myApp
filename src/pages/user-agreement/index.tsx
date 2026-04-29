import { View, Text } from '@tarojs/components'
import { palette } from '../../theme/palette'

function Section(props: { title: string; children: any }) {
  return (
    <View style={{
      backgroundColor: palette.card,
      borderRadius: '18px',
      padding: '16px',
      marginBottom: '14px',
      border: `1px solid ${palette.line}`,
    }}>
      <View style={{ marginBottom: '8px' }}>
        <Text style={{ fontSize: '15px', fontWeight: 'bold', color: palette.text }}>{props.title}</Text>
      </View>
      {props.children}
    </View>
  )
}

function BodyText(props: { children: any }) {
  return <Text style={{ fontSize: '13px', color: palette.subtext, lineHeight: '22px' }}>{props.children}</Text>
}

export default function UserAgreementPage() {
  return (
    <View style={{ minHeight: '100vh', backgroundColor: palette.bg, padding: '16px', boxSizing: 'border-box' }}>
      <View style={{ marginBottom: '14px' }}>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', color: palette.text }}>用户协议</Text>
        <View style={{ marginTop: '6px' }}>
          <Text style={{ fontSize: '12px', color: palette.subtext, lineHeight: '18px' }}>
            更新日期：2026-04-26
          </Text>
        </View>
      </View>

      <Section title='1. 协议范围'>
        <BodyText>
          本协议适用于你使用可雀小程序提供的学习社区浏览、活动查看、同路人地图、资料填写、联络请求、信息提交与纠错等功能。你使用本产品，即表示你已阅读、理解并同意本协议。
        </BodyText>
      </Section>

      <Section title='2. 账号与使用资格'>
        <BodyText>
          本产品当前主要面向成年人使用。你应确保提交的信息真实、准确、合法，并对通过你的设备或账号进行的操作负责。若你代表家庭、组织或团队使用本产品，应确保你有权提交相关信息。
        </BodyText>
      </Section>

      <Section title='3. 信息发布与提交'>
        <BodyText>
          你可以提交个人资料、学习社区信息、活动信息或纠错反馈。请勿提交违法违规、侵权、虚假、诱导性、骚扰性、歧视性、暴力色情、广告垃圾、侵犯他人隐私，或包含未成年人敏感身份细节的内容。
        </BodyText>
      </Section>

      <Section title='4. 同路人联络规则'>
        <BodyText>
          同路人功能用于帮助具有相近教育探索需求的成年人建立低风险初步联系。你应尊重对方意愿，不得骚扰、诱导、收集或滥用他人联系方式。对方拒绝、静音或拉黑后，请停止继续联系。
        </BodyText>
      </Section>

      <Section title='5. 学习社区与活动信息说明'>
        <BodyText>
          平台展示的学习社区、活动与相关介绍可能来自公开资料、用户提交或运营方整理。我们会尽力维护信息准确性，但不保证所有信息实时、完整或适合你的具体情况。报名前请自行向组织方核实时间、地点、费用、资质、安全安排与退款规则。
        </BodyText>
      </Section>

      <Section title='6. 平台管理'>
        <BodyText>
          为维护社区秩序与用户安全，我们可能对内容进行安全审核、隐藏、删除、限制展示，或对异常行为采取限制使用、暂停联络、拉黑、记录举报等措施。若你认为处理有误，可以通过产品内后续公示的联系方式反馈。
        </BodyText>
      </Section>

      <Section title='7. 风险自担'>
        <BodyText>
          通过本产品获取的信息、建立的联系或参与的线下活动，均需要你基于自身判断谨慎决策。涉及未成年人、线下见面、付费活动、长期项目、住宿交通或人身安全时，请额外核验并采取必要保护措施。
        </BodyText>
      </Section>

      <Section title='8. 知识产权'>
        <BodyText>
          可雀的界面、文案、结构、代码、标识与产品设计受相关法律保护。你提交的内容仍归你或原权利人所有，但你授权我们在提供、展示、审核、优化和推广产品所必需的范围内使用这些内容。
        </BodyText>
      </Section>

      <Section title='9. 协议变更'>
        <BodyText>
          我们可能根据产品功能、运营策略或法律要求更新本协议。更新后会在页面中展示新的更新日期。若你继续使用相关功能，即视为接受更新后的协议。
        </BodyText>
      </Section>
    </View>
  )
}
