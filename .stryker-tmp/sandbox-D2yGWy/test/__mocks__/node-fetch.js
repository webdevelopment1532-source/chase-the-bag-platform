// @ts-nocheck
module.exports = jest.fn(async () => ({
  ok: true,
  status: 200,
  text: async () => '',
  json: async () => ({}),
}));
