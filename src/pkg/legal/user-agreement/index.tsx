import { Text, View } from '@tarojs/components'
import { CURRENT_TERMS_VERSION, LEGAL_CONTACT_EMAIL } from '../../../constants/legal'
import AppPage from '../../../components/common/AppPage'
import AppCard from '../../../components/common/AppCard'
import { palette } from '../../../theme/palette'
import { space } from '../../../theme/spacing'
import { typography } from '../../../theme/typography'

function Section(props: { title: string; children: any }) {
  return (
    <AppCard padding={space(4)} marginBottom={space(3)}>
      <View style={{ marginBottom: space(2) }}>
        <Text style={{ ...typography.bodyStrong, color: palette.text }}>{props.title}</Text>
      </View>
      {props.children}
    </AppCard>
  )
}

function BodyText(props: { children: any }) {
  return <Text style={{ ...typography.meta, color: palette.subtext }}>{props.children}</Text>
}

export default function UserAgreementPage() {
  return (
    <AppPage>
      <View style={{ marginBottom: space(4) }}>
        <Text style={{ ...typography.title, color: palette.text }}>用户协议</Text>
        <View style={{ marginTop: space(1) }}><Text style={{ ...typography.micro, color: palette.subtext }}>更新日期：{CURRENT_TERMS_VERSION}</Text></View>
      </View>

      <Section title='1. 协议范围'>
        <BodyText>本协议适用于可雀小程序提供的学习社区浏览、活动查看、同路人地图、成员目录、资料填写、信息提交与纠错等功能。若你对本协议、隐私或安全处理有疑问，可以通过指定联系邮箱 {LEGAL_CONTACT_EMAIL} 联系我们。</BodyText>
      </Section>

      <Section title='2. 账号与使用资格'>
        <BodyText>本产品当前仅面向18周岁及以上用户。你提交资料或使用成员目录、提交、纠错等互动功能，即表示你确认自己已满18周岁，并确保提交的信息真实、准确、合法。未成年人不应自行注册、填写资料或提交成员目录信息。</BodyText>
      </Section>

      <Section title='3. 信息发布与提交'>
        <BodyText>你可以提交个人资料、学习社区信息、活动信息或纠错反馈。请勿提交违法违规、侵权、虚假、骚扰性、广告垃圾、侵犯他人隐私，或包含未成年人敏感身份细节的内容。若你提交活动组织者联系方式，请确保该联系方式可用于活动咨询或已获得相关授权。</BodyText>
      </Section>

      <Section title='4. 成员目录使用规则'>
        <BodyText>同路人地图和成员目录用于浏览成年人用户自愿填写的公开资料。公开资料分为两层：未完成资料的访问者可查看显示名、身份、城市、简介和“和这个生态的关系”等公开卡片信息；已登录并完成个人资料的用户，可查看对方选择展示的扩展公开资料，例如联系方式、添加备注、家庭教育关注或教育服务说明。平台不提供私信、好友申请、站内撮合、双边请求或联系方式交换服务。你应尊重他人边界，不得骚扰、诱导、收集或滥用他人联系方式。</BodyText>
      </Section>

      <Section title='5. 学习社区与活动信息说明'>
        <BodyText>平台展示的学习社区、活动与相关介绍可能来自公开资料、用户提交或运营方整理。我们会尽力维护信息准确性，但不保证所有信息实时、完整或适合你的具体情况。报名前请自行核实时间、地点、费用、资质、安全安排和实际参与条件。</BodyText>
      </Section>

      <Section title='6. 平台管理'>
        <BodyText>为维护社区秩序与用户安全，我们可能对内容进行安全审核、隐藏、删除、限制展示，或对异常行为采取限制使用、隐藏资料、拉黑、记录举报等措施。若你认为处理有误，可以通过产品内入口或发送邮件反馈。</BodyText>
      </Section>

      <Section title='7. 风险自担'>
        <BodyText>通过本产品获取的信息、查看的成员目录资料或参与的线下活动，均需要你基于自身判断谨慎决策。涉及未成年人、线下见面、付费活动、长期项目、资质承诺或人身安全时，请额外核验并采取必要保护措施。可雀不是学校资质认证机构、活动安全担保方、交易担保方或人际关系撮合方。</BodyText>
      </Section>
    </AppPage>
  )
}
