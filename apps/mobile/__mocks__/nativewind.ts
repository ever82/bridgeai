// NativeWind mock
export const useTailwind = jest.fn(() => ({
  className: (_className: string) => ({
    style: {},
  }),
}));

export default {
  useTailwind,
};
