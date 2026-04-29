/**
 * 用户隐私设置类型
 */
// 资料可见性级别
export var ProfileVisibility;
(function (ProfileVisibility) {
    ProfileVisibility["PUBLIC"] = "public";
    ProfileVisibility["FRIENDS"] = "friends";
    ProfileVisibility["PRIVATE"] = "private";
})(ProfileVisibility || (ProfileVisibility = {}));
// 在线状态可见性
export var OnlineStatusVisibility;
(function (OnlineStatusVisibility) {
    OnlineStatusVisibility["EVERYONE"] = "everyone";
    OnlineStatusVisibility["FRIENDS"] = "friends";
    OnlineStatusVisibility["NOBODY"] = "nobody";
})(OnlineStatusVisibility || (OnlineStatusVisibility = {}));
// 联系方式可见性
export var ContactVisibility;
(function (ContactVisibility) {
    ContactVisibility["PUBLIC"] = "public";
    ContactVisibility["FRIENDS"] = "friends";
    ContactVisibility["HIDDEN"] = "hidden";
})(ContactVisibility || (ContactVisibility = {}));
// 默认隐私设置
export const DEFAULT_PRIVACY_SETTINGS = {
    profileVisibility: ProfileVisibility.PUBLIC,
    onlineStatusVisibility: OnlineStatusVisibility.EVERYONE,
    phoneVisibility: ContactVisibility.HIDDEN,
    emailVisibility: ContactVisibility.HIDDEN,
    allowSearchByPhone: false,
    allowSearchByEmail: false,
    showLastSeen: true,
};
//# sourceMappingURL=privacy.js.map