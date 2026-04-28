import React from 'react';

const createIconSet = () => {
  const Icon = (props: { name?: string; size?: number; color?: string }) =>
    React.createElement('Icon', props);
  Icon.displayName = 'Icon';
  return Icon;
};

export const Ionicons = createIconSet();
export const MaterialIcons = createIconSet();
export const FontAwesome = createIconSet();
export const AntDesign = createIconSet();
export const Entypo = createIconSet();
export const EvilIcons = createIconSet();
export const Feather = createIconSet();
export const Foundation = createIconSet();
export const MaterialCommunityIcons = createIconSet();
export const Octicons = createIconSet();
export const SimpleLineIcons = createIconSet();
export const Zocial = createIconSet();
