const userV2 = require('./userV2')

module.exports = {
  getMe: userV2.getMe,
  saveProfile: userV2.saveProfile,
  updatePrivacySettings: userV2.updatePrivacySettings,
  requestAccountDeletion: userV2.requestAccountDeletion,
  getSafetyOverview: userV2.getSafetyOverview,
  sendRequest: userV2.sendRequest,
  respondRequest: userV2.respondRequest,
  manageConnection: userV2.manageConnection,
  manageSafetyRelation: userV2.manageSafetyRelation,
  reportUser: userV2.reportUser,
}
