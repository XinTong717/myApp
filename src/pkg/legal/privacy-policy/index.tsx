import { Text, View } from '@tarojs/components'
import { CURRENT_PRIVACY_VERSION, LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR_NAME } from '../../../constants/legal'
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

export default function PrivacyPolicyPage() {
  return (
    <AppPage>
      <View style={{ marginBottom: space(4) }}>
        <Text style={{ ...typography.title, color: palette.text }}>隐私政策</Text>
        <View style={{ marginTop: space(1) }}><Text style={{ ...typography.micro, color: palette.subtext }}>更新日期：{CURRENT_PRIVACY_VERSION}</Text></View>
      </View>

      <Section title='1. 适用范围'>
        <BodyText>本政策适用于可雀小程序内的学习社区浏览、活动查看、同路人地图、成员目录、资料填写、信息提交、信息纠错、安全举报、管理员审核等功能。</BodyText>
      </Section>

      <Section title='2. 运营主体与联系方式'>
        <BodyText>本产品由{LEGAL_OPERATOR_NAME}运营。若你需要查询、更正、删除个人信息，撤回公开展示，或反馈隐私与安全问题，可以通过指定联系邮箱 {LEGAL_CONTACT_EMAIL} 联系我们，也可以优先使用小程序内现有入口处理资料修改、地图展示和扩展公开资料可见性设置。</BodyText>
      </Section>

      <Section title='3. 我们会收集哪些信息'>
        <BodyText>你主动填写的信息可能包括：显示名、身份、所在省市、个人简介、联系方式、添加备注说明，以及你选择提供的家庭教育关注信息或教育服务信息。为实现安全功能，我们还会处理拉黑或静音关系、举报记录及相关时间信息。为实现风险控制、内容安全和故障排查，我们也会处理必要的操作时间、请求标识、内容安全校验结果和云函数处理日志。</BodyText>
      </Section>

      <Section title='4. 我们如何使用这些信息'>
        <BodyText>我们使用这些信息提供地图浏览、学习社区信息展示、活动查看、成员目录浏览、资料保存、信息纠错处理、内容安全校验、举报处理、管理员审核、故障排查与风险控制等功能。联系方式和添加备注仅用于成员目录展示，平台不提供私信、好友申请、站内撮合或双边请求服务。</BodyText>
      </Section>

      <Section title='5. 哪些信息会公开展示'>
        <BodyText>你选择出现在地图上时，可能公开展示的信息包括：显示名、身份、省市、简介以及你与本教育生态的关系说明。地图位置仅用于近似分布浏览，不应被理解为精确住址。联系方式、添加备注、家庭教育关注信息和教育服务内容，仅对已登录并完成个人资料的用户可见；你也可以在【我的】页关闭扩展公开资料可见性。</BodyText>
      </Section>

      <Section title='6. 未成年人相关信息'>
        <BodyText>本产品当前面向成年人使用。若你以家长身份填写家庭教育关注信息，请仅提供概括性信息，避免提交可直接识别未成年人的姓名、学校、住址、联系方式、证件号码、照片、精确行程或其他敏感细节。</BodyText>
      </Section>

      <Section title='7. 你的权利'>
        <BodyText>你可以在【我的】页查看、修改、补充或清空你主动填写的资料，也可以控制是否出现在地图上、是否展示扩展公开资料。若你希望进一步删除信息、停止展示、撤回授权或反馈隐私问题，可以通过产品内现有入口或发送邮件联系我们。</BodyText>
      </Section>
    </AppPage>
  )
}
