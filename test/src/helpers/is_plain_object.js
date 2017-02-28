import expect from 'expect.js';
import isPlainObject from '../../../lib/helpers/is_plain_object';

function validateItems(checks, pass) {
  checks.forEach(check => {
    expect(isPlainObject(check)).to.be(pass);
  });
}

describe('isPlainObject', function () {
  describe('non-object primitives', function () {
    it('return false', function () {
      const checks = [
        100,
        true,
        'i am a string',
        function noop() {},
        null,
      ];

      validateItems(checks, false);
    });
  });

  describe('arrays', function () {
    it('return false', function () {
      const checks = [
        [],
        [1,2,3],
        ['just a string'],
      ];

      validateItems(checks, false);
    });
  });

  describe('', function () {
    it('return true', function () {
      const checks = [
        {},
        {one:1},
        {object:{with:{array:[]}}},
      ];

      validateItems(checks, true);
    });
  });
});
