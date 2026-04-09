// NativeWind mock
export const useTailwind = jest.fn(() => ({
  className: (className: string) => ({
    style: {},
  }),
}));

export default {
  useTailwind,
};
